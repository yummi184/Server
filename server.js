const express = require('express');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fetch = require('node-fetch');
const crypto = require('crypto');

const blueBuyerCodeFile = path.join(__dirname, 'blueBuyerCode.json');

let blueBuyerCode;
if (fs.existsSync(blueBuyerCodeFile)) {
    const data = fs.readFileSync(blueBuyerCodeFile, 'utf8');
    blueBuyerCode = JSON.parse(data).code;
} else {
    blueBuyerCode = Math.floor(118738411 + Math.random() * 599938);
    fs.writeFileSync(blueBuyerCodeFile, JSON.stringify({ code: blueBuyerCode }));
}
console.log(`YOUR BUYER CODE: ${blueBuyerCode}`);

const serverStartTime = Date.now();

const userStates = {};
const bannedFilePath = path.join(__dirname, 'banned.json');
const usersFilePath = path.join(__dirname, 'users.json');

let activeUsers = 0;

if (!fs.existsSync(bannedFilePath)) {
    fs.writeFileSync(bannedFilePath, JSON.stringify([]));
}

if (!fs.existsSync(usersFilePath)) {
    fs.writeFileSync(usersFilePath, JSON.stringify({
        BLUEX: { id: 'creator001', password: 'Taloalob,1', isAdmin: true }
    }));
}

const loadBannedUsers = () => {
    try {
        return JSON.parse(fs.readFileSync(bannedFilePath));
    } catch (error) {
        console.error('Error loading banned users:', error);
        return [];
    }
};

const saveBannedUsers = (bannedUsers) => {
    try {
        fs.writeFileSync(bannedFilePath, JSON.stringify(bannedUsers));
    } catch (error) {
        console.error('Error saving banned users:', error);
    }
};

const loadUsers = () => {
    try {
        return JSON.parse(fs.readFileSync(usersFilePath));
    } catch (error) {
        console.error('Error loading users:', error);
        return {};
    }
};

const saveUsers = (users) => {
    try {
        fs.writeFileSync(usersFilePath, JSON.stringify(users));
    } catch (error) {
        console.error('Error saving users:', error);
    }
};

const deleteUser = (userId) => {
    try {
        const users = loadUsers();
        const userToDelete = Object.keys(users).find(username => users[username].id === userId);
        if (userToDelete) {
            delete users[userToDelete];
            saveUsers(users);

            const userDir = path.join(__dirname, 'users', String(userId));
            if (fs.existsSync(userDir)) {
                fs.rmSync(userDir, { recursive: true, force: true });
            }

            const bannedUsers = loadBannedUsers();
            const index = bannedUsers.indexOf(userId);
            if (index > -1) {
                bannedUsers.splice(index, 1);
                saveBannedUsers(bannedUsers);
            }

            return true;
        }
        return false;
    } catch (error) {
        console.error('Error deleting user:', error);
        return false;
    }
};

const getClientAccountCount = (clientId) => {
    const users = loadUsers();
    return Object.values(users).filter(user => user.clientId === clientId).length;
};

const getTotalUserCount = () => {
    const users = loadUsers();
    return Object.keys(users).length;
};

const getBannedUserCount = () => {
    const bannedUsers = loadBannedUsers();
    return bannedUsers.length;
};

const calculateDirectorySize = (directory) => {
    let totalSize = 0;
    const files = fs.readdirSync(directory);
    
    for (const file of files) {
        const filePath = path.join(directory, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile()) {
            totalSize += stats.size;
        } else if (stats.isDirectory()) {
            totalSize += calculateDirectorySize(filePath);
        }
    }
    
    return totalSize;
};

async function uploadFile(userId, filePath, content) {
  const fullPath = path.join(__dirname, 'users', userId, filePath);
  try {
    await fsPromises.mkdir(path.dirname(fullPath), { recursive: true });
    await fsPromises.writeFile(fullPath, content, 'utf-8');
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file');
  }
}

async function validateHuggingFaceAccess() {
    try {
        const response = await fetch('https://huggingface.co/spaces/FREEDEPLOY/DATABASE/raw/main/base.json');
        if (!response.ok) {
            return false;
        }
        const data = await response.json();
        
        if (!data.allowedBuyer || !Array.isArray(data.allowedBuyer)) {
            return false;
        }
        
        return data.allowedBuyer.includes(blueBuyerCode);
    } catch (error) {
        console.error('Error validating access:', error);
        return false;
    }
}

async function generateResetToken() {
  return crypto.randomBytes(20).toString('hex');
}

async function readFile(userId, filePath) {
  const fullPath = path.join(__dirname, 'users', userId, filePath);
  try {
    const content = await fsPromises.readFile(fullPath, 'utf-8');
    return content;
  } catch (error) {
    console.error('Error reading file:', error);
    throw new Error('Failed to read file');
  }
}

async function writeFile(userId, filePath, content) {
  const fullPath = path.join(__dirname, 'users', userId, filePath);
  try {
    await fsPromises.writeFile(fullPath, content, 'utf-8');
  } catch (error) {
    console.error('Error writing file:', error);
    throw new Error('Failed to write file');
  }
}

async function listFiles(userId, dirPath = '') {
  const fullPath = path.join(__dirname, 'users', userId, dirPath);
  try {
    const items = await fsPromises.readdir(fullPath, { withFileTypes: true });
    return items.map(item => ({
      name: item.name,
      type: item.isDirectory() ? 'folder' : 'file',
      path: path.join(dirPath, item.name)
    }));
  } catch (error) {
    console.error('Error listing files:', error);
    throw new Error('Failed to list files');
  }
}

app.use(express.static('public'));
app.use(express.json());

const runNpmStartForAllUsers = () => {
    const usersDir = path.join(__dirname, 'users');
    if (fs.existsSync(usersDir)) {
        const userDirs = fs.readdirSync(usersDir);

        userDirs.forEach((userDir) => {
            const userPath = path.join(usersDir, userDir);
            const packageJsonPath = path.join(userPath, 'package.json');

            if (fs.existsSync(packageJsonPath)) {
                console.log(`✅ STARTED PROCESS FOR: [${userDir}]`);
                const npmStart = spawn('npm', ['start'], { cwd: userPath });

                npmStart.stdout.on('data', (data) => console.log(``));
                npmStart.stderr.on('data', (data) => console.error(``));
                npmStart.on('close', (code) => {
                    if (code === 0) {
                        console.log(`✅ [${userDir}] Status: Success`);
                    } else {
                        console.error(`❌ [${userDir}] Status: Failed`);
                    }
                });
            } else {
                console.log(`⚠️ SKIPPED [${userDir}]: No package.json found.`);
            }
        });
    } else {
        console.log('❌ NO USERS DIRECTORY FOUND.');
    }
};

runNpmStartForAllUsers();

function getServerRuntime() {
    const uptime = Date.now() - serverStartTime;
    const days = Math.floor(uptime / (24 * 60 * 60 * 1000));
    const hours = Math.floor((uptime % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((uptime % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((uptime % (60 * 1000)) / 1000);
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function getSystemStatus() {
    return {
        cpu: Math.floor(Math.random() * 100),
        memory: Math.floor(Math.random() * 100),
        disk: Math.floor(Math.random() * 100)
    };
}

function getUserStats() {
    return {
        total: getTotalUserCount(),
        active: activeUsers,
        banned: getBannedUserCount()
    };
}

io.on('connection', (socket) => {
    console.log('A user connected');
    activeUsers++;
    io.emit('userStats', getUserStats());

    socket.on('register', async ({ username, password, clientId }) => {
        try {
            const isValid = await validateHuggingFaceAccess();
            if (!isValid) {
                socket.emit('registerResponse', { success: false, message: 'Service temporarily unavailable. Please try again later.' });
                return;
            }
            if (typeof username !== 'string' || typeof password !== 'string' || typeof clientId !== 'string') {
                throw new Error('Invalid input types');
            }

            if (password.length < 7) {
                socket.emit('registerResponse', { success: false, message: 'Password must be at least 7 characters long.' });
                return;
            }

            const users = loadUsers();

            if (getTotalUserCount() >= 30) {
                socket.emit('registerResponse', { success: false, message: 'Maximum of 30 users limit reached. Register on another server or contact developer.' });
            } else if (getClientAccountCount(clientId) >= 1) {
                socket.emit('registerResponse', { success: false, message: 'You can only create up to 1 accounts per device 😊' });
            } else if (users[username]) {
                socket.emit('registerResponse', { success: false, message: 'Username already exists 🐐' });
            } else {
                const userId = Math.random().toString(36).substr(2, 9);
                users[username] = { id: userId, password: password, isAdmin: false, clientId: clientId };
                saveUsers(users);
                socket.emit('registerResponse', { success: true, userId: userId });
            }
        } catch (error) {
            console.error('Error during registration:', error);
            socket.emit('registerResponse', { success: false, message: 'An error occurred during registration' });
        }
    });

    socket.on('login', async ({ username, password }) => {
        try {
            const isValid = await validateHuggingFaceAccess();
            if (!isValid) {
                socket.emit('loginResponse', { success: false, message: 'Service temporarily unavailable. Please try again later.' });
                return;
            }
            if (typeof username !== 'string' || typeof password !== 'string') {
                throw new Error('Invalid input types');
            }

            const users = loadUsers();

            if (users[username] && users[username].password === password) {
                socket.emit('loginResponse', { 
                    success: true, 
                    userId: users[username].id, 
                    isAdmin: users[username].isAdmin 
                });
            } else {
                socket.emit('loginResponse', { success: false, message: 'Invalid username or password' });
            }
        } catch (error) {
            console.error('Error during login:', error);
            socket.emit('loginResponse', { success: false, message: 'An error occurred during login' });
        }
    });

    socket.on('adminGetUsers', () => {
        try {
            const users = loadUsers();
            const userList = Object.keys(users).map(username => ({
                username,
                id: users[username].id,
                isAdmin: users[username].isAdmin,
                password: users[username].password // Include password
            }));
            const totalUserCount = getTotalUserCount();
            socket.emit('adminUserList', { users: userList, totalUserCount });
        } catch (error) {
            console.error('Error getting user list:', error);
            socket.emit('adminUserList', { users: [], totalUserCount: 0 });
        }
    });

    socket.on('adminBanUser', (userId) => {
        try {
            if (typeof userId !== 'string') {
                throw new Error('Invalid input type');
            }

            const bannedUsers = loadBannedUsers();
            if (!bannedUsers.includes(userId)) {
                bannedUsers.push(userId);
                saveBannedUsers(bannedUsers);
                socket.emit('adminBanResponse', { success: true, message: 'User banned successfully' });
                io.emit('userStats', getUserStats());
            } else {
                socket.emit('adminBanResponse', { success: false, message: 'User is already banned' });
            }
        } catch (error) {
            console.error('Error banning user:', error);
            socket.emit('adminBanResponse', { success: false, message: 'An error occurred while banning the user' });
        }
    });

    socket.on('adminUnbanUser', (userId) => {
        try {
            if (typeof userId !== 'string') {
                throw new Error('Invalid input type');
            }

            const bannedUsers = loadBannedUsers();
            const index = bannedUsers.indexOf(userId);
            if (index > -1) {
                bannedUsers.splice(index, 1);
                saveBannedUsers(bannedUsers);
                socket.emit('adminUnbanResponse', { success: true, message: 'User unbanned successfully' });
                io.emit('userStats', getUserStats());
            } else {
                socket.emit('adminUnbanResponse', { success: false, message: 'User is not banned' });
            }
        } catch (error) {
            console.error('Error unbanning user:', error);
            socket.emit('adminUnbanResponse', { success: false, message: 'An error occurred while unbanning the user' });
        }
    });

    socket.on('adminDeleteUser', (userId) => {
        try {
            if (typeof userId !== 'string') {
                throw new Error('Invalid input type');
            }

            if (deleteUser(userId)) {
                socket.emit('adminDeleteUserResponse', { success: true, message: 'User deleted successfully' });
                io.emit('userStats', getUserStats());
            } else {
                socket.emit('adminDeleteUserResponse', { success: false, message: 'User not found or could not be deleted' });
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            socket.emit('adminDeleteUserResponse', { success: false, message: 'An error occurred while deleting the user' });
        }
    });

    socket.on('adminMakeAdmin', (userId) => {
        try {
            if (typeof userId !== 'string') {
                throw new Error('Invalid input type');
            }

            const users = loadUsers();
            const userToUpdate = Object.keys(users).find(username => users[username].id === userId);
            if (userToUpdate) {
                users[userToUpdate].isAdmin = true;
                saveUsers(users);
                socket.emit('adminMakeAdminResponse', { success: true, message: 'User is now an admin' });
            } else {
                socket.emit('adminMakeAdminResponse', { success: false, message: 'User not found' });
            }
        } catch (error) {
            console.error('Error making user admin:', error);
            socket.emit('adminMakeAdminResponse', { success: false, message: 'An error occurred while making the user an admin' });
        }
    });

    socket.on('adminRemoveAdmin', (userId) => {
        try {
            if (typeof userId !== 'string') {
                throw new Error('Invalid input type');
            }

            const users = loadUsers();
            const userToUpdate = Object.keys(users).find(username => users[username].id === userId);
            if (userToUpdate) {
                users[userToUpdate].isAdmin = false;
                saveUsers(users);
                socket.emit('adminRemoveAdminResponse', { success: true, message: 'Admin privileges removed from user' });
            } else {
                socket.emit('adminRemoveAdminResponse', { success: false, message: 'User not found' });
            }
        } catch (error) {
            console.error('Error removing admin privileges:', error);
            socket.emit('adminRemoveAdminResponse', { success: false, message: 'An error occurred while removing admin privileges' });
        }
    });

    socket.on('start', (userId) => {
        try {
            if (typeof userId !== 'string') {
                throw new Error('Invalid input type');
            }

            const bannedUsers = loadBannedUsers();

            if (bannedUsers.includes(userId)) {
                socket.emit('message', '❌ You are banned from using this service by BLUEDEMON 🤤');
                return;
            }

            const userDir = path.join(__dirname, 'users', String(userId));
            if (!fs.existsSync(userDir)) {
                fs.mkdirSync(userDir, { recursive: true });
            }

            const spaceUsed = calculateDirectorySize(userDir);
            const spaceUsedMB = (spaceUsed / (1024 * 1024)).toFixed(2);
            socket.emit('message', { type: 'spaceUsage', usage: `${spaceUsedMB} MB` });

            userStates[userId] = { step: 'ask_repo', started: true };
            socket.emit('message', '⚧️ WELCOME! Please provide the Repository URL you wish to clone and run🏴,\nThe cloned repo can also be edited after refreshing the page');
        } catch (error) {
            console.error('Error starting user session:', error);
            socket.emit('message', '❌ An error occurred while starting your session. Please try again.');
        }
    });

    socket.on('command', async (data) => {
        try {
            if (typeof data !== 'object' || typeof data.userId !== 'string' || typeof data.message !== 'string') {
                throw new Error('Invalid input types');
            }

            const { userId, message } = data;
            const bannedUsers = loadBannedUsers();

            if (bannedUsers.includes(userId)) {
                socket.emit('message', '❌ You are banned from using this service by BLUEDEMON 🤤');
                return;
            }

            if (!userStates[userId]?.started) {
                socket.emit('message', '❌ Please use the start command before proceeding so as to avoid error');
                return;
            }

            const userDir = path.join(__dirname, 'users', String(userId));
            if (!userStates[userId]) {
                userStates[userId] = { step: 'ask_repo', started: false };
            }
            const userState = userStates[userId];

            switch (true) {
                case message.toLowerCase() === 'clear':
                    if (fs.existsSync(userDir)) {
                        socket.emit('message', '🗑 Clearing your directory...');
                        const rmProcess = spawn('rm', ['-rf', userDir]);

                        rmProcess.on('close', (code) => {
                            if (code === 0) {
                                socket.emit('message', '✅ Your directory has been cleared successfully.');
                            } else {
                                socket.emit('message', '❌ Failed to clear your directory.');
                            }
                        });
                    } else {
                        socket.emit('message', '❌ Directory not found.');
                    }
                    break;

                case message.toLowerCase() === 'list':
                    try {
                        const files = await listFiles(userId);
                        socket.emit('message', `📂 Files:: ${files.map(f => f.name).join('\n, ')}`);
                    } catch (error) {
                        socket.emit('message', '❌ No file in your directory.');
                    }
                    break;

                case message.toLowerCase().startsWith('run '):
                    const filenameToRun = message.slice(4).trim();
                    const filePathToRun = path.join(userDir, filenameToRun);

                    if (!fs.existsSync(filePathToRun)) {
                        return socket.emit('message', '❌ The specified file does not exist.');
                    }

                    socket.emit('message', `🚀 Running the file: ${filenameToRun}`);
                    const nodeProcess = spawn('node', [filePathToRun], { cwd: userDir });

                    userStates[userId].runningProcess = nodeProcess;

                    nodeProcess.stdout.on('data', (data) => socket.emit('message', `✅ NODE OUTPUT:\n${data}`));
                    nodeProcess.stderr.on('data', (data) => socket.emit('message', `⚠️ NODE ERROR:\n${data}`));
                    nodeProcess.on('close', (code) => {
                        socket.emit('message', `🚀 Script finished with code ${code}`);
                        delete userStates[userId].runningProcess;
                    });

                    userStates[userId].step = 'interacting';
                    break;

                case userState.step === 'ask_repo':
                    const repoUrl = message;
                    if (!repoUrl.startsWith('https://github.com/')) {
                        socket.emit('message', '❌ Invalid repository URL. Please provide a valid GitHub repository URL starting with https://github.com/');
                        return;
                    }
                    socket.emit('message', `🔄 Cloning the repository from: ${repoUrl}`);
                    const gitClone = spawn('git', ['clone', repoUrl, '.'], { cwd: userDir });

                    gitClone.stdout.on('data', (data) => socket.emit('message', `✅ GIT OUTPUT:\n${data}`));
                    gitClone.stderr.on('data', (data) => socket.emit('message', `⚠️ GIT ERROR:\n${data}`));
                    gitClone.on('close', (code) => {
                        if (code === 0) {
                            socket.emit('message', '✅ Repository cloned successfully!\nNow Installing dependencies...');
                            const yarnInstall = spawn('yarn', ['install'], { cwd: userDir });

                            yarnInstall.stdout.on('data', (data) => socket.emit('message', `✅ YARN OUTPUT:\n${data}`));
                            yarnInstall.stderr.on('data', (data) => socket.emit('message', `⚠️ YARN ERROR:\n${data}`));
                            yarnInstall.on('close', (installCode) => {
                                if (installCode === 0) {
                                    socket.emit('message', '✅ Dependencies installed successfully!!\nWhich file would you like to run e.g index.js');
                                    userStates[userId].step = 'ask_file';
                                } else {
                                    socket.emit('message', '❌ Error installing dependencies.');
                                }
                            });
                        } else {
                            socket.emit('message', '❌ Error cloning the repository.');
                        }
                    });
                    break;

                case userState.step === 'ask_file':
                    const filename = message;
                    const filePath = path.join(userDir, filename);

                    if (!fs.existsSync(filePath)) {
                        return socket.emit('message', '❌ The specified file does not exist.');
                    }

                    socket.emit('message', `🚀 Running the file: ${filename}`);
                    const nodeProcessFile = spawn('node', [filePath], { cwd: userDir });

                    userStates[userId].runningProcess = nodeProcessFile;

                    nodeProcessFile.stdout.on('data', (data) => socket.emit('message', `✅ NODE OUTPUT:\n${data}`));
                    nodeProcessFile.stderr.on('data', (data) => socket.emit('message', `⚠️ NODE ERROR:\n${data}`));
                    nodeProcessFile.on('close', (code) => {
                        socket.emit('message', `🚀 Script finished with code ${code}`);
                        delete userStates[userId].runningProcess;
                    });

                    userStates[userId].step = 'interacting';
                    break;

                case userState.step === 'interacting':
                    if (userState.runningProcess) {
                        userState.runningProcess.stdin.write(message + '\n');
                    } else {
                        socket.emit('message', '❌ No active process to interact with. Please run a file first.');
                    }
                    break;

                default:
                    socket.emit('message', '❌ Unrecognized command. Use list, clear, or start.');
            }
        } catch (error) {
            console.error('Error processing command:', error);
            socket.emit('message', '❌ An error occurred while processing your command. Please try again.');
        }
    });

    socket.on('readFile', async ({ userId, filePath }) => {
      try {
        const content = await readFile(userId, filePath);
        socket.emit('fileContent', { filePath, content });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('writeFile', async ({ userId, filePath, content }) => {
      try {
        await writeFile(userId, filePath, content);
        socket.emit('fileSaved', { filePath });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('listFiles', async ({ userId, dirPath }) => {
      try {
        const files = await listFiles(userId, dirPath);
        socket.emit('fileList', files);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('uploadFile', async ({ userId, filePath, content }) => {
      try {
        await uploadFile(userId, filePath, content);
        socket.emit('fileUploaded', { filePath });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });


    socket.on('getServerRuntime', () => {
        try {
            socket.emit('serverRuntime', getServerRuntime());
        } catch (error) {
            console.error('Error getting server runtime:', error);
            socket.emit('serverRuntime', 'Error getting server runtime');
        }
    });

    socket.on('getSystemStatus', () => {
        try {
            socket.emit('systemStatus', getSystemStatus());
        } catch (error) {
            console.error('Error getting system status:', error);
            socket.emit('systemStatus', { cpu: 0, memory: 0, disk: 0 });
        }
    });

    socket.on('getUserStats', () => {
        try {
            socket.emit('userStats', getUserStats());
        } catch (error) {
            console.error('Error getting user stats:', error);
            socket.emit('userStats', { total: 0, active: 0, banned: 0 });
        }
    });
    
    socket.on('forgotPassword', async (clientId) => {
  try {
    const users = loadUsers();
    const user = Object.values(users).find(u => u.clientId === clientId);
    
    if (user) {
      const resetToken = await generateResetToken();
      user.resetToken = resetToken;
      user.resetTokenExpires = Date.now() + 3600000; 
      saveUsers(users);
      
      socket.emit('resetTokenGenerated', { username: user.username, resetToken });
    } else {
      socket.emit('resetTokenError', 'No user found with this client ID');
    }
  } catch (error) {
    console.error('Error in forgot password process:', error);
    socket.emit('resetTokenError', 'An error occurred during the password reset process');
  }
});

socket.on('resetPassword', async ({ resetToken, newPassword }) => {
  try {
    const users = loadUsers();
    const user = Object.values(users).find(u => u.resetToken === resetToken && u.resetTokenExpires > Date.now());
    
    if (user) {
      user.password = newPassword;
      delete user.resetToken;
      delete user.resetTokenExpires;
      saveUsers(users);
      socket.emit('passwordResetSuccess', 'Password has been reset successfully');
    } else {
      socket.emit('passwordResetError', 'Invalid or expired reset token');
    }
  } catch (error) {
    console.error('Error in password reset process:', error);
    socket.emit('passwordResetError', 'An error occurred during the password reset process');
  }
});

    socket.on('disconnect', () => {
        console.log('User disconnected');
        activeUsers--;
        io.emit('userStats', getUserStats());
    });
});

setInterval(() => {
    try {
        io.emit('serverRuntime', getServerRuntime());
        io.emit('systemStatus', getSystemStatus());
        io.emit('userStats', getUserStats());
    } catch (error) {
        console.error('Error emitting periodic updates:', error);
    }
}, 5000);

const PORT = process.env.PORT || 7860;
http.listen(PORT, () => console.log(`🌐 Server running on port ${PORT}.`));

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

