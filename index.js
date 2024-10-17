const FtpSrv = require('ftp-srv');
const fs = require('fs');
const path = require('path');

const ftpServer = new FtpSrv({
    url: 'ftp://10.10.20.108:1337',  // Use your internal server IP
    anonymous: true,
    greeting: 'Welcome to the FTP server!',
    logging: 'basic',
    pasv_url: '10.10.20.108',  // Set this to your server's accessible IP address or hostname
    pasv_min: 1024,            // Set a range for passive mode ports
    pasv_max: 1048,
  });

const users = {
  user: 'password', // Basic Authentication (insecure - for demonstration only)
};
ftpServer.on('login', (data, resolve, reject) => {
    const rootDir = path.resolve('./tmp');
    
    if (!fs.existsSync(rootDir)) {
      fs.mkdirSync(rootDir, { recursive: true });
    }
  
    resolve({ root: rootDir });
  });
ftpServer.on('login', (data, resolve, reject) => {
  try {
    if (users[data.username] === data.password) {
        const rootDir = path.resolve('./tmp');

    if (!fs.existsSync(rootDir)) {
        fs.mkdirSync(rootDir, { recursive: true });
      }
      resolve({ root: rootDir });
    } else {
      reject({ message: 'Invalid username or password' });
    }
  } catch (error) {
    reject({ message: 'Error authenticating user', error: error.message });
  }
});

ftpServer.on('error', (error) => {
  console.error('FTP server error:', error);
});

ftpServer.on('clientError', (error, client) => {
  console.error('Client error:', error, 'from', client.remoteAddress);
});

ftpServer.on('ready', () => {
  console.log('FTP server ready');
});

ftpServer.on('close', () => {
  console.log('FTP server closed');
});

// Basic file operations with enhanced error handling
ftpServer.on('delete', (filename, resolve, reject) => {
  try {
    fs.unlinkSync(path.join(process.cwd(), filename));
    resolve({ message: 'File deleted successfully' });
  } catch (error) {
    console.error(`Error deleting file: ${filename}`, error);
    reject({ message: 'Error deleting file', error: error.message });
  }
});

ftpServer.on('rename', (oldPath, newPath, resolve, reject) => {
  try {
    fs.renameSync(path.join(process.cwd(), oldPath), path.join(process.cwd(), newPath));
    resolve({ message: 'File renamed successfully' });
  } catch (error) {
    console.error(`Error renaming file from ${oldPath} to ${newPath}`, error);
    reject({ message: 'Error renaming file', error: error.message });
  }
});

ftpServer.on('mkdir', (pathname, resolve, reject) => {
  try {
    fs.mkdirSync(path.join(process.cwd(), pathname));
    resolve({ message: 'Directory created successfully' });
  } catch (error) {
    console.error(`Error creating directory: ${pathname}`, error);
    reject({ message: 'Error creating directory', error: error.message });
  }
});

ftpServer.on('rmdir', (pathname, resolve, reject) => {
  try {
    fs.rmdirSync(path.join(process.cwd(), pathname));
    resolve({ message: 'Directory deleted successfully' });
  } catch (error) {
    console.error(`Error deleting directory: ${pathname}`, error);
    reject({ message: 'Error deleting directory', error: error.message });
  }
});

ftpServer.on('STOR', (filename, stream, resolve, reject) => {
  try {
    fs.writeFileSync(path.join(process.cwd(), filename), stream);
    resolve({ message: 'File uploaded successfully' });
  } catch (error) {
    console.error(`Error uploading file: ${filename}`, error);
    reject({ message: 'Error uploading file', error: error.message });
  }
});

ftpServer.on('RETR', (filename, stream, resolve, reject) => {
  try {
    const filePath = path.join(process.cwd(), filename);
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filename}`);
      reject({ message: `File ${filename} not found` });
      return;
    }
    const fileContent = fs.readFileSync(filePath);
    stream.end(fileContent);
    resolve({ message: 'File downloaded successfully' });
  } catch (error) {
    console.error(`Error downloading file: ${filename}`, error);
    reject({ message: 'Error downloading file', error: error.message });
  }
});

ftpServer.on('LIST', (pathname, resolve, reject) => {
    try {
      const dirPath = path.join(process.cwd(), pathname || './tmp');
      console.log(`Listing directory: ${dirPath}`);
  
      if (!fs.existsSync(dirPath)) {
        console.error(`Directory does not exist: ${dirPath}`);
        reject({ message: `Directory ${dirPath} not found` });
        return;
      }
  
      const files = fs.readdirSync(dirPath);
      console.log(`Files in directory: ${files.join(', ')}`);
      
      resolve({ files });
    } catch (error) {
      console.error(`Error listing directory: ${pathname}`, error);
      reject({ message: 'Error listing directory', error: error.message });
    }
  });

  ftpServer.on('CWD', (pathname, resolve, reject) => {
    try {
      const newDir = path.join(process.cwd(), pathname);
      
      if (!fs.existsSync(newDir)) {
        console.error(`CWD failed: directory does not exist: ${newDir}`);
        reject({ message: `Directory ${newDir} not found` });
        return;
      }
  
      process.chdir(newDir);
      console.log(`Changed directory to: ${newDir}`);
      
      resolve({ message: 'Directory changed successfully' });
    } catch (error) {
      console.error(`Error changing directory to: ${pathname}`, error);
      reject({ message: 'Error changing directory', error: error.message });
    }
  });

// Custom FTP commands with enhanced error handling and logging
ftpServer.on('SITE', (command, resolve, reject, socket) => {
  try {
    switch (command) {
      case 'HELP':
        resolve({ message: 'SITE commands: HELP, STATUS' });
        break;
      case 'STATUS':
        resolve({ message: 'Server status: OK' });
        break;
      default:
        console.error(`Unsupported SITE command: ${command}`);
        socket.write(`500 Unsupported SITE command: ${command}\r\n`);
        reject({ message: 'Unsupported SITE command' });
    }
  } catch (error) {
    console.error(`Error handling SITE command: ${command}`, error);
    socket.write(`500 Error handling SITE command: ${command}\r\n`);
    reject({ message: 'Error handling SITE command', error: error.message });
  }
});

// Global command logging and error handling
ftpServer.on('command', (command, data, resolve, reject, socket) => {
  console.log(`Received command: ${command}`, data);
  
  // If command is unrecognized
  socket.write(`500 Unknown command: ${command}\r\n`);
  reject({ message: `Unknown command: ${command}` });
});

ftpServer.listen().then(() => {
  console.log('FTP server is listening on 10.10.20.108:1337');
});
