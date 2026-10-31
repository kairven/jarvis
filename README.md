# FRIDAY

A local-first, owner-controlled personal intelligence system. This repository now contains the FRIDAY foundation; the former JARVIS application has been removed from the working tree.

Start here: **[FRIDAY setup, architecture, security and roadmap](friday/README.md)**.

FRIDAY currently provides a local web control center, persistent conversation and owner-managed memories. It can use an installed local Ollama model or an explicitly configured OpenAI API key. Model-backed conversation requires a working provider; neither option provides autonomous agents or external tool access yet.

Run the tests with `python3 -m unittest discover -s friday/tests -v`.
