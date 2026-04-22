const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic();
const historyFile = path.join(app.getPath('userData'), 'chat-history.json');

let mainWindow;
let conversationHistory = [];

// Load chat history
function loadHistory() {
  try {
    if (fs.existsSync(historyFile)) {
      const data = fs.readFileSync(historyFile, 'utf-8');
      conversationHistory = JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading history:', error);
  }
}

// Save chat history
function saveHistory() {
  try {
    fs.writeFileSync(historyFile, JSON.stringify(conversationHistory, null, 2));
  } catch (error) {
    console.error('Error saving history:', error);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });

  mainWindow.loadFile('index.html');
}

app.on('ready', () => {
  loadHistory();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Handle chat messages
ipcMain.handle('send-message', async (event, userMessage, apiKey) => {
  try {
    conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    const clientWithKey = new Anthropic({ apiKey });
    const response = await clientWithKey.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: conversationHistory,
    });

    const assistantMessage = response.content[0].text;
    conversationHistory.push({
      role: 'assistant',
      content: assistantMessage,
    });

    saveHistory();
    return assistantMessage;
  } catch (error) {
    return `Error: ${error.message}`;
  }
});

ipcMain.handle('get-history', () => conversationHistory);

ipcMain.handle('clear-history', () => {
  conversationHistory = [];
  saveHistory();
  return true;
});
