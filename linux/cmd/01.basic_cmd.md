# Essential Linux Commands Reference Guide

## File and Directory Operations

### `ls` - List Directory Contents
Lists files and directories in the current or specified directory.
```bash
ls                    # List files in current directory
ls -l                 # Long format (detailed information)
ls -la                # Include hidden files (starting with .)
ls -lh                # Human-readable file sizes
ls /home/user         # List specific directory
ls *.txt              # List only .txt files
```

### `cd` - Change Directory
Navigate between directories.
```bash
cd /home/user         # Go to specific directory
cd ..                 # Go up one directory
cd ~                  # Go to home directory
cd -                  # Go to previous directory
cd                    # Go to home directory (same as cd ~)
```

### `pwd` - Print Working Directory
Shows the full path of your current directory.
```bash
pwd                   # Output: /home/username/Documents
```

### `mkdir` - Make Directory
Create new directories.
```bash
mkdir newfolder       # Create single directory
mkdir -p path/to/dir  # Create nested directories
mkdir dir1 dir2 dir3  # Create multiple directories
mkdir -m 755 mydir    # Create with specific permissions
```

### `rmdir` - Remove Directory
Remove empty directories only.
```bash
rmdir emptyfolder     # Remove empty directory
rmdir -p path/to/empty/dirs  # Remove nested empty directories
```

### `rm` - Remove Files and Directories
Delete files and directories (be careful!).
```bash
rm file.txt           # Remove single file
rm file1.txt file2.txt # Remove multiple files
rm -r directory       # Remove directory and its contents
rm -rf directory      # Force remove (no confirmation)
rm *.tmp              # Remove all .tmp files
rm -i file.txt        # Interactive mode (asks confirmation)
```

## File Operations

### `cp` - Copy Files and Directories
Copy files or directories from source to destination.
```bash
cp file.txt backup.txt        # Copy file
cp file.txt /home/user/       # Copy to directory
cp -r folder1 folder2         # Copy directory recursively
cp -p file.txt backup.txt     # Preserve permissions and timestamps
cp *.jpg /backup/             # Copy all .jpg files
```

### `mv` - Move/Rename Files and Directories
Move or rename files and directories.
```bash
mv oldname.txt newname.txt    # Rename file
mv file.txt /home/user/       # Move file to directory
mv folder1 folder2            # Rename/move directory
mv *.pdf documents/           # Move all PDF files
```

### `touch` - Create Empty Files or Update Timestamps
Create new empty files or update modification time.
```bash
touch newfile.txt             # Create empty file
touch file1.txt file2.txt     # Create multiple files
touch -t 202312251200 file.txt # Set specific timestamp
```

## File Content Operations

### `cat` - Display File Contents
Show the entire content of files.
```bash
cat file.txt                  # Display file content
cat file1.txt file2.txt       # Display multiple files
cat > newfile.txt             # Create file and write content (Ctrl+D to save)
cat file.txt | grep "search"  # Combine with other commands
```

### `less` and `more` - View File Contents Page by Page
View large files one page at a time.
```bash
less largefile.txt            # Navigate with arrows, q to quit
more largefile.txt            # Space for next page, q to quit
```

### `head` - Show First Lines
Display the first few lines of a file.
```bash
head file.txt                 # Show first 10 lines
head -n 5 file.txt            # Show first 5 lines
head -c 100 file.txt          # Show first 100 characters
```

### `tail` - Show Last Lines
Display the last few lines of a file.
```bash
tail file.txt                 # Show last 10 lines
tail -n 20 file.txt           # Show last 20 lines
tail -f logfile.txt           # Follow file changes (great for logs)
```

### `grep` - Search Text Patterns
Search for text patterns in files.
```bash
grep "pattern" file.txt       # Search for pattern in file
grep -i "pattern" file.txt    # Case-insensitive search
grep -r "pattern" directory/  # Search recursively in directory
grep -n "pattern" file.txt    # Show line numbers
grep -v "pattern" file.txt    # Show lines NOT containing pattern
grep "^start" file.txt        # Lines starting with "start"
grep "end$" file.txt          # Lines ending with "end"
```

## File Permissions and Ownership

### `chmod` - Change File Permissions
Modify file and directory permissions.
```bash
chmod 755 script.sh           # rwxr-xr-x (owner: rwx, group: r-x, others: r-x)
chmod +x script.sh            # Add execute permission
chmod -w file.txt             # Remove write permission
chmod u+w file.txt            # Add write for user
chmod g-r file.txt            # Remove read for group
chmod o=r file.txt            # Set others to read-only
```

### `chown` - Change File Ownership
Change file owner and group.
```bash
chown user file.txt           # Change owner
chown user:group file.txt     # Change owner and group
chown -R user:group directory/ # Change recursively
```

## System Information

### `ps` - Show Running Processes
Display information about running processes.
```bash
ps                            # Show processes in current terminal
ps aux                        # Show all processes (detailed)
ps -ef                        # Show all processes (different format)
ps aux | grep firefox         # Find specific process
```

### `top` - Real-time Process Viewer
Show real-time system processes and resource usage.
```bash
top                           # Interactive process viewer (q to quit)
htop                          # Enhanced version (if installed)
```

### `df` - Show Disk Space Usage
Display filesystem disk space usage.
```bash
df                            # Show disk usage
df -h                         # Human-readable format
df -h /                       # Show usage for root partition
```

### `du` - Show Directory Space Usage
Display directory space usage.
```bash
du                            # Show sizes of current directory
du -h                         # Human-readable format
du -sh                        # Summary of current directory
du -sh *                      # Size of each item in current directory
```

### `free` - Show Memory Usage
Display memory and swap usage.
```bash
free                          # Show memory usage
free -h                       # Human-readable format
free -m                       # Show in MB
```

### `uname` - System Information
Display system information.
```bash
uname -a                      # All system information
uname -r                      # Kernel version
uname -m                      # Machine architecture
```

## Network Commands

### `ping` - Test Network Connectivity
Test network connection to a host.
```bash
ping google.com               # Ping until stopped (Ctrl+C)
ping -c 4 google.com          # Ping 4 times and stop
ping -i 2 google.com          # Ping every 2 seconds
```

### `wget` - Download Files
Download files from the internet.
```bash
wget https://example.com/file.zip        # Download file
wget -O newname.zip https://example.com/file.zip  # Save with different name
wget -c https://example.com/largefile.zip # Continue interrupted download
```

### `curl` - Transfer Data
Transfer data to/from servers.
```bash
curl https://api.example.com             # GET request
curl -o file.html https://example.com    # Save to file
curl -X POST -d "data" https://api.com   # POST request
```

## Archive and Compression

### `tar` - Archive Files
Create and extract archive files.
```bash
tar -czf archive.tar.gz folder/          # Create compressed archive
tar -xzf archive.tar.gz                  # Extract compressed archive
tar -tf archive.tar.gz                   # List archive contents
tar -xzf archive.tar.gz -C /destination/ # Extract to specific directory
```

### `zip` and `unzip` - ZIP Archives
Work with ZIP files.
```bash
zip archive.zip file1.txt file2.txt      # Create ZIP archive
zip -r archive.zip folder/               # ZIP directory recursively
unzip archive.zip                        # Extract ZIP file
unzip -l archive.zip                     # List ZIP contents
```

## Text Processing

### `sort` - Sort Lines
Sort lines in text files.
```bash
sort file.txt                 # Sort alphabetically
sort -n numbers.txt           # Sort numerically
sort -r file.txt              # Sort in reverse order
sort -u file.txt              # Sort and remove duplicates
```

### `uniq` - Remove Duplicate Lines
Remove duplicate adjacent lines.
```bash
uniq file.txt                 # Remove duplicates (file must be sorted first)
sort file.txt | uniq          # Sort then remove duplicates
uniq -c file.txt              # Count occurrences
```

### `wc` - Word Count
Count lines, words, and characters.
```bash
wc file.txt                   # Lines, words, characters
wc -l file.txt                # Count lines only
wc -w file.txt                # Count words only
wc -c file.txt                # Count characters only
```

### `cut` - Extract Columns
Extract specific columns from text.
```bash
cut -d',' -f1,3 data.csv      # Extract columns 1 and 3 from CSV
cut -c1-10 file.txt           # Extract characters 1-10
echo "hello:world" | cut -d':' -f2  # Output: world
```

## Process Management

### `kill` - Terminate Processes
Send signals to processes.
```bash
kill 1234                     # Terminate process with PID 1234
kill -9 1234                  # Force kill process
killall firefox               # Kill all firefox processes
pkill -f "script.py"          # Kill processes matching pattern
```

### `jobs` - Show Active Jobs
Display active jobs in current shell.
```bash
jobs                          # List active jobs
jobs -l                       # List with process IDs
```

### `bg` and `fg` - Background/Foreground Jobs
Manage background and foreground processes.
```bash
command &                     # Start command in background
bg %1                         # Send job 1 to background
fg %1                         # Bring job 1 to foreground
```

## File Search

### `find` - Search for Files and Directories
Search for files and directories by various criteria.
```bash
find /home -name "*.txt"      # Find all .txt files in /home
find . -type f -name "*.log"  # Find files with .log extension
find . -type d -name "temp"   # Find directories named "temp"
find . -size +10M             # Find files larger than 10MB
find . -mtime -7              # Find files modified in last 7 days
find . -name "*.tmp" -delete  # Find and delete .tmp files
```

### `locate` - Quick File Search
Quickly find files using a database (needs updatedb).
```bash
locate filename.txt           # Find files named filename.txt
locate "*.pdf"                # Find all PDF files
sudo updatedb                 # Update the locate database
```

### `which` - Find Command Location
Find the location of executable commands.
```bash
which python                  # Show path to python command
which -a python               # Show all paths to python
```

## Input/Output Redirection

### Redirection Operators
Control where command output goes.
```bash
command > file.txt            # Redirect output to file (overwrite)
command >> file.txt           # Redirect output to file (append)
command < input.txt           # Use file as input
command 2> error.log          # Redirect errors to file
command > output.txt 2>&1     # Redirect both output and errors
```

### Pipes (`|`)
Chain commands together.
```bash
ls -l | grep "txt"            # List files and filter for .txt
cat file.txt | sort | uniq    # Sort and remove duplicates
ps aux | grep firefox | wc -l # Count firefox processes
```

## Environment and Variables

### `env` - Show Environment Variables
Display environment variables.
```bash
env                           # Show all environment variables
env | grep PATH               # Show PATH variable
```

### `export` - Set Environment Variables
Set environment variables.
```bash
export MY_VAR="hello"         # Set variable
export PATH=$PATH:/new/path   # Add to PATH
```

### `history` - Command History
Show and manage command history.
```bash
history                       # Show command history
history | grep "git"          # Search command history
!123                          # Re-run command number 123
!!                            # Re-run last command
```

## System Control

### `sudo` - Execute as Another User
Execute commands with elevated privileges.
```bash
sudo command                  # Run command as root
sudo -u username command      # Run command as specific user
sudo !!                       # Re-run last command with sudo
```

### `passwd` - Change Password
Change user password.
```bash
passwd                        # Change your password
sudo passwd username          # Change another user's password
```

### `su` - Switch User
Switch to another user account.
```bash
su                           # Switch to root
su username                  # Switch to specific user
su -                         # Switch to root with root's environment
```

## Quick Tips for Usage

1. **Getting Help**: Use `man command` (e.g., `man ls`) to read the manual for any command
2. **Tab Completion**: Press Tab to auto-complete file names and commands
3. **Command History**: Use Up/Down arrows to navigate through previous commands
4. **Stopping Commands**: Press Ctrl+C to stop a running command
5. **Clear Screen**: Use `clear` or Ctrl+L to clear the terminal
6. **Multiple Commands**: Use `;` to run multiple commands (e.g., `ls; pwd`)
7. **Conditional Execution**: Use `&&` for success-dependent execution (e.g., `mkdir test && cd test`)

## Safety Reminders

- Always be careful with `rm -rf` - it permanently deletes files
- Test commands in a safe directory first
- Use `ls` to verify file locations before moving/deleting
- Keep backups of important files
- Use `chmod` carefully to avoid breaking file permissions