#!/usr/bin/env node

import { createConnection } from 'vscode-languageserver/node'
import { PgsidLanguageServer } from './language-server/server.js'

new PgsidLanguageServer(createConnection(process.stdin, process.stdout)).listen()
