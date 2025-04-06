const socket = io();

// DOM elements
const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const adminSection = document.getElementById('admin-section');
const usernameInput = document.getElementById('username-input');
const passwordInput = document.getElementById('password-input');
const registerBtn = document.getElementById('register-btn');
const loginBtn = document.getElementById('login-btn');
const logDisplay = document.getElementById('log-display');
const commandInput = document.getElementById('command-input');
const sendButton = document.getElementById('send-command');
const getUsersBtn = document.getElementById('get-users-btn');
const userList = document.getElementById('user-list');
const userIdInput = document.getElementById('user-id-input');
const loginInterface = document.getElementById('login-interface');
const listBtn = document.getElementById('list-btn');
const clearBtn = document.getElementById('clear-btn');
const restartBtn = document.getElementById('restart-btn');
const serverRuntime = document.getElementById('server-runtime');
const togglePasswordBtn = document.getElementById('toggle-password');
const passwordStrength = document.getElementById('password-strength');
const passwordRequirements = document.getElementById('password-requirements');
const searchUsersInput = document.getElementById('search-users');
const paginationContainer = document.getElementById('pagination');
const actionSelect = document.getElementById('action-select');
const executeActionBtn = document.getElementById('execute-action-btn');
const spaceUsage = document.getElementById('space-usage');
const activeUsers = document.getElementById('active-users');
const fileList = document.getElementById('file-list');
const cpuUsage = document.getElementById('cpu-usage');
const memoryUsage = document.getElementById('memory-usage');
const diskUsage = document.getElementById('disk-usage');
const totalUsers = document.getElementById('total-users');
const activeSessions = document.getElementById('active-sessions');
const bannedUsers = document.getElementById('banned-users');
const fileEditor = document.getElementById('file-editor');
const fileContent = document.getElementById('file-content');
const currentFile = document.getElementById('current-file');
const saveFileBtn = document.getElementById('save-file');
const backBtn = document.getElementById('back-btn');
const uploadBtn = document.getElementById('upload-btn');
const fileInput = document.getElementById('file-input');

let currentUserId = null;
let isAdmin = false;
let allUsers = [];
let currentPage = 1;
const usersPerPage = 15;
let currentPath = '';

function appendLog(message, target = logDisplay) {
    const logEntry = document.createElement('div');
    logEntry.textContent = message;
    logEntry.classList.add('log-entry', 'fade-in');
    target.appendChild(logEntry);
    target.scrollTop = target.scrollHeight;
}

function showAppSection() {
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    const username = Object.keys(users).find(name => users[name].id === currentUserId) || 'BLUExDEMON TECH 🌹';
    
    authSection.classList.add('hidden');
    loginInterface.classList.add('hidden');
    appSection.classList.remove('hidden');
    if (isAdmin) {
        adminSection.classList.remove('hidden');
    }
    
    // Add username display above terminal
    const usernameDisplay = document.createElement('div');
    usernameDisplay.textContent = `DASHBOARD - ${username}`;
    usernameDisplay.classList.add('text-lg', 'font-bold', 'mb-2', 'text-green-500');
    logDisplay.parentNode.insertBefore(usernameDisplay, logDisplay);
    
    // Display BLUE ID message and user's UID
    appendLog("This is your unique ID👇");
    appendLog(`${currentUserId}`);
    
    setTimeout(() => {
        socket.emit('start', currentUserId);
        socket.emit('getServerRuntime');
        socket.emit('listFiles', { userId: currentUserId, dirPath: '' });
    }, 500);

    // Update server status information
    socket.emit('getServerRuntime');
    socket.emit('getSystemStatus');
    socket.emit('getUserStats');
    socket.emit('listFiles', { userId: currentUserId, dirPath: '' });
}

function logout() {
    currentUserId = null;
    isAdmin = false;
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('users');
    authSection.classList.remove('hidden');
    loginInterface.classList.add('hidden');
    appSection.classList.add('hidden');
    adminSection.classList.add('hidden');
    appendLog('Logged out successfully');
}

function checkExistingSession() {
    currentUserId = localStorage.getItem('currentUserId');
    isAdmin = localStorage.getItem('isAdmin') === 'true';
    
    if (currentUserId) {
        showAppSection();
        appendLog(`Welcome back!😊😊`);
    } else {
        authSection.classList.remove('hidden');
        loginInterface.classList.add('hidden');
    }
}

function getClientId() {
    let clientId = localStorage.getItem('clientId');
    if (!clientId) {
        clientId = 'client_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('clientId', clientId);
    }
    return clientId;
}

function togglePasswordVisibility() {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    togglePasswordBtn.innerHTML = type === 'password' ? 
        '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" /></svg>' : 
        '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd" /><path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" /></svg>';
}

function checkPasswordStrength() {
    const password = passwordInput.value;
    passwordRequirements.classList.remove('hidden');
    
    let strength = 0;
    if (password.length >= 7) strength++;
    if (password.match(/[a-z]+/)) strength++;
    if (password.match(/[A-Z]+/)) strength++;
    if (password.match(/[0-9]+/)) strength++;
    if (password.match(/[$@#&!]+/)) strength++;

    switch (strength) {
        case 0:
        case 1:
            passwordStrength.textContent = 'Password strength: Weak';
            passwordStrength.className = 'text-sm text-red-500';
            return false;
        case 2:
        case 3:
            passwordStrength.textContent = 'Password strength: Moderate';
            passwordStrength.className = 'text-sm text-yellow-500';
            return true;
        case 4:
        case 5:
            passwordStrength.textContent = 'Password strength: Strong';
            passwordStrength.className = 'text-sm text-green-500';
            return true;
    }
}

function displayUsers(users) {
  userList.innerHTML = `
    <div class="p-2 border-b border-gray-600 font-bold">Total Users: ${users.length} / 40</div>
    <div class="text-red-500 font-bold p-2">⚠️ Warning: Displaying passwords is a severe security risk!</div>
  `;
  users.forEach(user => {
    const userElement = document.createElement('div');
    userElement.textContent = `USERNAME: ${user.username}, ID: ${user.id}, ADMIN: ${user.isAdmin}, PASSWORD: ${user.password}`;
    userElement.classList.add('p-2', 'border-b', 'border-gray-600');
    userList.appendChild(userElement);
  });
}

function filterUsers() {
    const searchTerm = searchUsersInput.value.toLowerCase();
    const filteredUsers = allUsers.filter(user => 
        user.username.toLowerCase().includes(searchTerm) || 
        user.id.toLowerCase().includes(searchTerm)
    );
    displayUsers(filteredUsers);
    setupPagination(filteredUsers);
}

function setupPagination(users) {
    const pageCount = Math.ceil(users.length / usersPerPage);
    paginationContainer.innerHTML = '';
    
    for (let i = 1; i <= pageCount; i++) {
        const button = document.createElement('button');
        button.innerText = i;
        button.classList.add('px-3', 'py-1', 'bg-gray-700', 'hover:bg-gray-600', 'rounded');
        button.addEventListener('click', () => {
            currentPage = i;
            displayUsers(users.slice((i - 1) * usersPerPage, i * usersPerPage));
        });
        paginationContainer.appendChild(button);
    }
}

function updateFileList(files) {
  fileList.innerHTML = '';
  files.forEach(file => {
    const li = document.createElement('li');
    li.textContent = file.name;
    li.classList.add(file.type);
    li.addEventListener('click', () => {
      if (file.type === 'folder') {
        socket.emit('listFiles', { userId: currentUserId, dirPath: file.path });
      } else {
        socket.emit('readFile', { userId: currentUserId, filePath: file.path });
      }
    });
    fileList.appendChild(li);
  });
}

function showFileEditor(filePath, content) {
  fileEditor.classList.remove('hidden');
  currentFile.textContent = filePath;
  fileContent.value = content;
}

function updateFileExplorer(files) {
  updateFileList(files);
  backBtn.style.display = currentPath ? 'block' : 'none';
}

function goBack() {
  if (currentPath) {
    const parentPath = currentPath.split('/').slice(0, -1).join('/');
    socket.emit('listFiles', { userId: currentUserId, dirPath: parentPath });
  }
}

saveFileBtn.addEventListener('click', () => {
  const filePath = currentFile.textContent;
  const content = fileContent.value;
  socket.emit('writeFile', { userId: currentUserId, filePath, content });
});


// Event Listeners
registerBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    if (username && password) {
        if (currentUserId) {
            showNotification('You are already logged in. Please log out to create a new account.', 'error');
        } else if (!checkPasswordStrength()) {
            showNotification('Please choose a stronger password.', 'error');
        } else {
            loginInterface.classList.remove('hidden');
            loginInterface.innerHTML = '';
            appendLog('Registering...', loginInterface);
            socket.emit('register', { username, password, clientId: getClientId() });
        }
    } else {
        showNotification('Please enter both username and password', 'error');
    }
});

loginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const username = usernameInput.value;
    const password = passwordInput.value;
    if (username && password) {
        loginInterface.classList.remove('hidden');
        loginInterface.innerHTML = '';
        appendLog('Logging in...', loginInterface);
        socket.emit('login', { username, password, clientId: getClientId() });
    } else {
        showNotification('Please enter both username and password', 'error');
    }
});

sendButton.addEventListener('click', () => {
    const command = commandInput.value;

    if (!currentUserId) {
        appendLog('Please log in first');
        return;
    }

    if (!command) {
        appendLog('Please enter a command');
        return;
    }

    socket.emit('command', { userId: currentUserId, message: command });

    commandInput.value = '';
});

listBtn.addEventListener('click', () => {
    if (currentUserId) {
        socket.emit('command', { userId: currentUserId, message: 'list' });
    } else {
        appendLog('Please log in first');
    }
});

clearBtn.addEventListener('click', () => {
    if (currentUserId) {
        socket.emit('command', { userId: currentUserId, message: 'clear' });
    } else {
        appendLog('Please log in first');
    }
});

restartBtn.addEventListener('click', () => {
    if (currentUserId) {
        socket.emit('start', currentUserId);
    } else {
        appendLog('Please log in first');
    }
});

getUsersBtn.addEventListener('click', () => {
    if (isAdmin) {
        socket.emit('adminGetUsers');
    }
});

executeActionBtn.addEventListener('click', () => {
    if (isAdmin) {
        const userId = userIdInput.value;
        const action = actionSelect.value;
        if (userId && action) {
            switch (action) {
                case 'ban':
                    socket.emit('adminBanUser', userId);
                    break;
                case 'unban':
                    socket.emit('adminUnbanUser', userId);
                    break;
                case 'delete':
                    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
                        socket.emit('adminDeleteUser', userId);
                    }
                    break;
                default:
                    appendLog('Invalid action selected');
            }
        } else {
            appendLog('Please enter a User ID and select an action');
        }
    }
});


document.getElementById('forgot-password-link').addEventListener('click', (e) => {
    e.preventDefault();
    const clientId = getClientId();
    socket.emit('forgotPassword', clientId);
    showNotification('Processing your request...', 'info');
});

socket.on('resetTokenGenerated', ({ username, resetToken }) => {
    showNotification(`Reset token generated for ${username}. Please check your email.`, 'info');
   
    promptForNewPassword(resetToken);
});

socket.on('resetTokenError', (message) => {
    showNotification(message, 'error');
});

socket.on('passwordResetSuccess', (message) => {
    showNotification(message, 'info');
});

socket.on('passwordResetError', (message) => {
    showNotification(message, 'error');
});

function promptForNewPassword(resetToken) {
    const newPassword = prompt('Enter your new password:');
    if (newPassword) {
        socket.emit('resetPassword', { resetToken, newPassword });
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.className = `fixed top-4 right-4 p-4 rounded shadow-lg ${type === 'error' ? 'bg-red-500' : 'bg-blue-500'} text-white`;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Update socket event listeners 
socket.on('registerResponse', (response) => {
    if (response.success) {
        showNotification(`Registered successfully. Your user ID is: ${response.userId}. Please log in.`, 'info');
      
        usernameInput.value = '';
        passwordInput.value = '';
        passwordStrength.textContent = '';
    } else {
        showNotification(`Registration failed: ${response.message}`, 'error');
    }
});

socket.on('loginResponse', (response) => {
    if (response.success) {
        currentUserId = response.userId;
        isAdmin = response.isAdmin;
        
        const users = JSON.parse(localStorage.getItem('users') || '{}');
        users[usernameInput.value] = { id: response.userId };
        localStorage.setItem('users', JSON.stringify(users));
        
        localStorage.setItem('currentUserId', currentUserId);
        localStorage.setItem('isAdmin', response.isAdmin);
        showNotification(`Access granted. Welcome back to your dashboard!

!`, 'info');
        showAppSection();
    } else {
        showNotification(`Login failed: ${response.message}`, 'error');
    }
});

socket.on('message', (message) => {
    if (typeof message === 'object' && message.type === 'spaceUsage') {
        spaceUsage.textContent = `${message.usage}`;
    } else if (message !== "This is your ID") {
        appendLog(message);
    }
  
    logDisplay.scrollTop = logDisplay.scrollHeight;
});

socket.on('adminUserList', ({ users, totalUserCount }) => {
    allUsers = users;
    displayUsers(users.slice(0, usersPerPage));
    setupPagination(users);
});

socket.on('adminBanResponse', (response) => {
    appendLog(response.message);
});

socket.on('adminUnbanResponse', (response) => {
    appendLog(response.message);
});

socket.on('adminDeleteUserResponse', (response) => {
    appendLog(response.message);
    if (response.success) {
    
        socket.emit('adminGetUsers');
    }
});

socket.on('serverRuntime', (runtime) => {
    serverRuntime.textContent = `${runtime}`;
});

socket.on('fileList', (files) => {
  currentPath = files.length > 0 ? files[0].path.split('/').slice(0, -1).join('/') : '';
  updateFileExplorer(files);
});

socket.on('fileContent', ({ filePath, content }) => {
  showFileEditor(filePath, content);
});

socket.on('fileSaved', ({ filePath }) => {
  showNotification(`File ${filePath} saved successfully`, 'info');

  socket.emit('listFiles', { userId: currentUserId, dirPath: currentPath });
});

socket.on('systemStatus', (status) => {
    cpuUsage.innerHTML = `CPU Usage: <span class="font-bold">${status.cpu}%</span>`;
    memoryUsage.innerHTML = `Memory Usage: <span class="font-bold">${status.memory}%</span>`;
    diskUsage.innerHTML = `Disk Usage: <span class="font-bold">${status.disk}%</span>`;
});

socket.on('userStats', (stats) => {
    totalUsers.innerHTML = `Total Users: <span class="font-bold">${stats.total}</span>`;
    activeSessions.innerHTML = `Active Sessions: <span class="font-bold">${stats.active}</span>`;
    bannedUsers.innerHTML = `Banned Users: <span class="font-bold">${stats.banned}</span>`;
    activeUsers.textContent = stats.active;
});

socket.on('start', (userId) => {
  // ... existing code ...
  socket.emit('listFiles', { userId: currentUserId, dirPath: '' });
});

document.getElementById('logout-btn').addEventListener('click', logout);
togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
passwordInput.addEventListener('input', checkPasswordStrength);
searchUsersInput.addEventListener('input', filterUsers);
backBtn.addEventListener('click', goBack);


uploadBtn.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const fileName = file.name;
      const filePath = currentPath ? `${currentPath}/${fileName}` : fileName;
      
      socket.emit('uploadFile', { userId: currentUserId, filePath, content });
    };
    reader.readAsText(file);
  }
});

socket.on('fileUploaded', ({ filePath }) => {
  showNotification(`File ${filePath} uploaded successfully`, 'info');
 
  socket.emit('listFiles', { userId: currentUserId, dirPath: currentPath });
});

checkExistingSession();


setInterval(() => {
  socket.emit('getServerRuntime');
  socket.emit('getSystemStatus');
  socket.emit('getUserStats');
}, 5000);

function fetchRandomQuote() {
    fetch('./quotes.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(quotes => {
            const randomIndex = Math.floor(Math.random() * quotes.length);
            const randomQuote = quotes[randomIndex];
            document.getElementById('quote-text').textContent = `${randomQuote.quote}`;
            document.getElementById('quote-author').textContent = `- ${randomQuote.author}`;
        })
        .catch(error => {
            console.error('Error fetching quote:', error);
            document.getElementById('quote-text').textContent = 'Failed to load quote';
            document.getElementById('quote-author').textContent = '';
        });
}


setInterval(fetchRandomQuote, 60000);

fetchRandomQuote();


const backgroundAudio = document.getElementById('backgroundAudio');
const audioControl = document.getElementById('audioControl');
let isAudioPlaying = false;

function toggleAudio() {
    if (isAudioPlaying) {
        backgroundAudio.pause();
        isAudioPlaying = false;
        audioControl.textContent = 'Play Audio';
    } else {
        playAudio();
    }
}

function playAudio() {
    backgroundAudio.play().then(() => {
        isAudioPlaying = true;
        audioControl.textContent = 'Pause Audio';
        console.log('Audio started playing');
    }).catch(error => {
        console.error('Audio playback failed:', error);
        audioControl.textContent = 'Play Audio';
    });
}

document.addEventListener('DOMContentLoaded', () => {
    playAudio();
});

audioControl.addEventListener('click', toggleAudio);

document.addEventListener('click', () => {
    if (!isAudioPlaying) {
        playAudio();
    }
});

