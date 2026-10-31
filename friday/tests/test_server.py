import importlib.util
import json
import os
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('friday_server', Path(__file__).resolve().parents[1] / 'server.py')
s = importlib.util.module_from_spec(spec); spec.loader.exec_module(s)

class FoundationTest(unittest.TestCase):
    def setUp(self):
        s.MODE = 'offline'; s.OPENAI_KEY = ''; self.temp = tempfile.TemporaryDirectory(); s.DB = Path(self.temp.name) / 'test.db'; s.TOKEN = 'x' * 32; s.init_db()
        self.http = ThreadingHTTPServer(('127.0.0.1', 0), s.Handler)
        self.thread = threading.Thread(target=self.http.serve_forever, daemon=True); self.thread.start()
        self.base = 'http://127.0.0.1:' + str(self.http.server_port)
    def tearDown(self):
        self.http.shutdown(); self.http.server_close(); self.thread.join(); self.temp.cleanup()
    def request(self, path, method='GET', data=None, auth=True):
        headers = {'Authorization': 'Bearer '+s.TOKEN} if auth else {}
        if data is not None: headers['Content-Type'] = 'application/json'; data = json.dumps(data).encode()
        req = urllib.request.Request(self.base+path, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req) as response: return response.status, json.load(response)
        except urllib.error.HTTPError as e: return e.code, json.load(e)
    def test_auth(self):
        self.assertEqual(self.request('/api/memories', auth=False)[0], 401)
        self.assertEqual(self.request('/api/memories', 'POST', {'content':'secret'}, auth=False)[0], 401)
    def test_memory_lifecycle_and_restart(self):
        status, obj = self.request('/api/memories','POST',{'content':'Likes tea','category':'preferences'}); self.assertEqual(status,201)
        ident = obj['id']; self.assertEqual(self.request('/api/memories')[1][0]['source'],'owner')
        self.assertEqual(self.request('/api/memories/'+str(ident),'PATCH',{'content':'Likes coffee'})[0],200)
        s.init_db()  # reopening the database does not erase state
        self.assertEqual(self.request('/api/memories')[1][0]['content'],'Likes coffee')
        self.assertEqual(self.request('/api/memories/'+str(ident),'DELETE')[0],200)
        self.assertEqual(self.request('/api/memories')[1],[])
        self.assertEqual(len(self.request('/api/audit')[1]),3)
    def test_invalid_memory(self):
        self.assertEqual(self.request('/api/memories','POST',{'content':'hi','category':'invalid'})[0],400)
    def test_model_failure_is_honest_and_persistent(self):
        with patch.object(s, 'ollama', side_effect=OSError('offline')):
            status, result = self.request('/api/chat','POST',{'content':'Hello'})
        self.assertEqual(status,503); self.assertIn('no response was generated',result['error'])
        self.assertEqual([x['role'] for x in self.request('/api/messages')[1]],['user'])
    def test_cloud_key_configuration_and_chat(self):
        s.MODE = 'online'; s.OPENAI_KEY = 'test-secret'; s.MODEL = 'test-model'
        status = self.request('/api/status')[1]
        self.assertEqual(status['mode'], 'ONLINE')
        self.assertEqual(status['model_status_kind'], 'configured')
        self.assertNotIn('test-secret', json.dumps(status))
        class Response:
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def read(self): return b'{"choices":[{"message":{"content":"Cloud answer"}}]}'
        with patch.object(s.urllib.request, 'urlopen', return_value=Response()) as request:
            reply = s.model_chat([{'role': 'user', 'content': 'hello'}])
        self.assertEqual(reply, 'Cloud answer')
        sent = request.call_args.args[0]
        self.assertEqual(sent.full_url, s.OPENAI_URL)
        self.assertEqual(sent.get_header('Authorization'), 'Bearer test-secret')
        self.assertEqual(json.loads(sent.data)['messages'][-1]['content'], 'hello')
    def test_cloud_failure_does_not_fabricate_response(self):
        s.MODE = 'online'; s.OPENAI_KEY = ''
        status, result = self.request('/api/chat', 'POST', {'content':'Hello'})
        self.assertEqual(status, 503)
        self.assertIn('no response was generated', result['error'])
        self.assertEqual([x['role'] for x in self.request('/api/messages')[1]], ['user'])

    def test_opt_in_memory_retrieval(self):
        self.request('/api/memories', 'POST', {'content': 'I prefer coffee', 'category': 'preferences'})
        with patch.object(s, 'model_chat', return_value='Noted') as model:
            status, reply = self.request('/api/chat', 'POST', {'content': 'What coffee do I prefer?', 'use_memory': True})
        self.assertEqual(status, 200)
        self.assertEqual(len(reply['memory_ids']), 1)
        self.assertIn('prefer coffee', model.call_args.args[1])
        with patch.object(s, 'model_chat', return_value='Hello') as model:
            self.request('/api/chat', 'POST', {'content': 'coffee'})
        self.assertIsNone(model.call_args.args[1])

    def test_tasks_agent_draft_and_review(self):
        ident = self.request('/api/tasks', 'POST', {'content': 'Plan a website', 'agent': 'coding'})[1]['id']
        with patch.object(s, 'model_chat', side_effect=['A plan', 'Review the tests']) as model:
            code, result = self.request('/api/tasks/%s/run' % ident, 'POST', {})
        self.assertEqual(code, 200); self.assertEqual(model.call_count, 2)
        self.assertEqual(result['review'], 'Review the tests')
        task = self.request('/api/tasks')[1][0]
        self.assertEqual(task['status'], 'review'); self.assertEqual(task['draft'], 'A plan')
        self.assertEqual(self.request('/api/tasks/%s' % ident, 'PATCH', {'status':'done'})[0], 200)
        self.assertEqual(self.request('/api/tasks/%s' % ident, 'DELETE')[0], 200)

    def test_agent_failure_and_validation(self):
        self.assertEqual(self.request('/api/tasks', 'POST', {'content':'hi','agent':'execution'})[0], 400)
        ident = self.request('/api/tasks', 'POST', {'content':'do work','agent':'research'})[1]['id']
        with patch.object(s, 'model_chat', side_effect=OSError('offline')):
            self.assertEqual(self.request('/api/tasks/%s/run' % ident, 'POST', {})[0], 503)
        task = self.request('/api/tasks')[1][0]
        self.assertEqual(task['status'], 'failed'); self.assertIsNone(task['draft'])
        self.assertEqual(self.request('/api/tasks/%s/run' % ident, 'POST', {}, auth=False)[0], 401)

    def test_model_success_persists(self):
        with patch.object(s, 'ollama', return_value={'message':{'content':'Hello there'}}):
            self.assertEqual(self.request('/api/chat','POST',{'content':'Hello'})[1]['content'],'Hello there')
        s.init_db()
        self.assertEqual([x['role'] for x in self.request('/api/messages')[1]],['user','assistant'])

if __name__ == '__main__': unittest.main()
