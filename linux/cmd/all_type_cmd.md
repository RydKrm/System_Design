# Complete DevOps Linux Commands Reference

## System Administration & Server Management

### System Information & Monitoring
```bash
# System info
uname -a                    # Complete system information
hostname                    # Display system hostname
hostnamectl                 # Display/set system hostname (systemd)
uptime                      # System uptime and load
who / w                     # Show logged in users
id                         # Display user and group IDs
whoami                     # Current username

# Hardware info
lscpu                      # CPU information
lsmem                      # Memory information
lsblk                      # Block devices
lspci                      # PCI devices
lsusb                      # USB devices
dmidecode                  # Hardware information from DMI
```

### Process Management
```bash
# Process monitoring
ps aux                     # All running processes
ps -ef                     # All processes with full format
pstree                     # Process tree
top                        # Real-time process viewer
htop                       # Enhanced top (if installed)
atop                       # Advanced system monitor
iotop                      # I/O usage by processes
pidof process_name         # Get PID of process

# Process control
kill PID                   # Terminate process
kill -9 PID               # Force kill process
killall process_name      # Kill all processes by name
pkill -f pattern          # Kill processes matching pattern
nohup command &           # Run command immune to hangups
jobs                      # List active jobs
bg / fg                   # Background/foreground jobs
disown                    # Remove job from shell's job table

# Process priorities
nice -n 10 command        # Run command with lower priority
renice 10 -p PID         # Change priority of running process
```

### Memory & Storage Management
```bash
# Memory monitoring
free -h                    # Memory usage (human readable)
vmstat                     # Virtual memory statistics
vmstat 2 5                # VM stats every 2 seconds, 5 times
cat /proc/meminfo         # Detailed memory information
slabtop                   # Kernel slab cache information

# Disk usage
df -h                     # Disk space usage
df -i                     # Inode usage
du -sh *                  # Size of directories/files
du -h --max-depth=1       # Directory sizes one level deep
ncdu                      # Interactive disk usage analyzer
lsof                      # List open files
lsof -p PID              # Files opened by specific process
lsof /path/to/file       # Processes using specific file

# Disk I/O
iotop                     # I/O usage by processes
iostat                    # I/O statistics
iostat -x 2              # Extended I/O stats every 2 seconds
```

## Network Administration

### Network Configuration
```bash
# Network interfaces
ip addr show              # Show IP addresses
ip link show              # Show network interfaces
ip route show            # Show routing table
ifconfig                 # Interface configuration (legacy)
route -n                 # Routing table (legacy)

# Network configuration
ip addr add 192.168.1.10/24 dev eth0    # Add IP address
ip link set eth0 up      # Bring interface up
ip route add default via 192.168.1.1    # Add default route
```

### Network Monitoring & Troubleshooting
```bash
# Connectivity testing
ping -c 4 google.com      # Ping 4 times
ping6 -c 4 google.com     # IPv6 ping
traceroute google.com     # Trace route to destination
mtr google.com            # Network diagnostic tool
nslookup google.com       # DNS lookup
dig google.com            # DNS lookup (advanced)
dig @8.8.8.8 google.com   # DNS query specific server

# Network connections
netstat -tuln             # Listening ports
netstat -rn               # Routing table
ss -tuln                  # Socket statistics (modern netstat)
ss -p                     # Show process using sockets
lsof -i                   # Network connections
lsof -i:80               # Processes using port 80
nmap localhost            # Port scanning

# Network traffic
tcpdump -i eth0           # Capture packets on eth0
tcpdump -i eth0 port 80   # Capture HTTP traffic
wireshark                 # GUI packet analyzer
iftop                     # Network usage by connection
nethogs                  # Network usage by process
```

## File System & Storage

### File Operations for DevOps
```bash
# Advanced file operations
rsync -av source/ dest/   # Sync directories
rsync -av --delete src/ dst/  # Sync and delete extra files
scp file.txt user@server:/path/  # Secure copy over SSH
sftp user@server          # Secure FTP

# File permissions & ownership
chmod 755 script.sh       # Set permissions
chmod +x script.sh        # Make executable
chown user:group file     # Change ownership
chattr +i file            # Make file immutable
lsattr file              # List file attributes

# File searching & analysis
find /var/log -name "*.log" -mtime +7  # Find old log files
find /etc -type f -exec grep -l "pattern" {} \;  # Find files containing pattern
locate filename           # Quick file search
which command             # Find command location
whereis command          # Find command, source, manual
```

### Mount & Filesystem Management
```bash
# Mounting
mount                     # Show mounted filesystems
mount /dev/sdb1 /mnt     # Mount filesystem
umount /mnt              # Unmount filesystem
mount -a                 # Mount all in /etc/fstab
findmnt                  # Show mounted filesystems tree

# Filesystem operations
mkfs.ext4 /dev/sdb1      # Create ext4 filesystem
fsck /dev/sdb1           # Check filesystem
tune2fs -l /dev/sdb1     # Show filesystem info
blkid                    # Show block device attributes
```

## Log Management & Analysis

### Log Files & Analysis
```bash
# System logs
journalctl                # systemd logs
journalctl -f            # Follow logs
journalctl -u service    # Logs for specific service
journalctl --since "1 hour ago"  # Recent logs
journalctl -p err        # Error level logs only

# Traditional log files
tail -f /var/log/syslog  # Follow system log
tail -f /var/log/auth.log  # Follow authentication log
grep "ERROR" /var/log/app.log  # Search for errors
zgrep "pattern" /var/log/app.log.gz  # Search in compressed logs

# Log rotation
logrotate -d /etc/logrotate.conf  # Test logrotate config
logrotate -f /etc/logrotate.conf  # Force log rotation
```

## Service Management

### systemd Services
```bash
# Service control
systemctl start service   # Start service
systemctl stop service    # Stop service
systemctl restart service # Restart service
systemctl reload service  # Reload service config
systemctl enable service  # Enable service at boot
systemctl disable service # Disable service at boot

# Service status
systemctl status service  # Service status
systemctl is-active service  # Check if active
systemctl is-enabled service # Check if enabled
systemctl list-units     # List all units
systemctl list-units --failed  # List failed units
systemctl --failed       # Show failed services

# Service logs
journalctl -u service     # Service logs
journalctl -u service -f  # Follow service logs
```

### Legacy Service Management (SysV)
```bash
service apache2 start     # Start service
service apache2 status    # Check status
chkconfig --list         # List services (RHEL/CentOS)
update-rc.d service enable  # Enable service (Debian/Ubuntu)
```

## Package Management

### Debian/Ubuntu (APT)
```bash
apt update                # Update package list
apt upgrade               # Upgrade packages
apt install package      # Install package
apt remove package       # Remove package
apt purge package        # Remove package and configs
apt search keyword       # Search packages
apt list --installed     # List installed packages
apt show package         # Show package info
dpkg -l                  # List installed packages
dpkg -i package.deb      # Install .deb file
```

### Red Hat/CentOS/Fedora (YUM/DNF)
```bash
yum update                # Update packages (RHEL/CentOS 7)
dnf update                # Update packages (RHEL 8+/Fedora)
yum install package      # Install package
yum remove package       # Remove package
yum search keyword       # Search packages
yum list installed      # List installed packages
yum info package         # Package information
rpm -qa                  # List all installed RPMs
rpm -ivh package.rpm     # Install RPM package
```

## User & Group Management

### User Management
```bash
# User operations
useradd username          # Add user
usermod -aG group user   # Add user to group
userdel username         # Delete user
passwd username          # Change user password
su - username            # Switch user
sudo -u user command     # Run command as user

# User information
id username              # User ID info
groups username          # User's groups
finger username          # User information
last                     # Last logged in users
lastlog                  # Last login for all users
```

### Group Management
```bash
groupadd groupname       # Add group
groupdel groupname       # Delete group
groupmod -n newname oldname  # Rename group
getent group             # List all groups
getent passwd            # List all users
```

## Security & Permissions

### File Permissions & ACLs
```bash
# Standard permissions
chmod 644 file           # rw-r--r--
chmod 755 directory     # rwxr-xr-x
chmod u+x file          # Add execute for owner
umask 022               # Set default permissions

# ACLs (if supported)
setfacl -m u:user:rwx file    # Set ACL for user
getfacl file                  # View ACLs
```

### SSH & Security
```bash
# SSH operations
ssh user@server          # Connect to server
ssh-keygen -t rsa        # Generate SSH key pair
ssh-copy-id user@server  # Copy public key to server
scp file.txt user@server:/path/  # Secure copy
sftp user@server         # Secure FTP

# Security monitoring
lastlog                  # Last logins
last                     # Login history
who                      # Currently logged in
w                        # Who is doing what
```

## Performance Monitoring & Tuning

### System Performance
```bash
# CPU monitoring
top                      # Process viewer
htop                     # Enhanced top
mpstat                   # CPU statistics
mpstat 2 5              # CPU stats every 2 seconds
sar -u                   # CPU utilization

# Memory monitoring
free -h                  # Memory usage
vmstat 2 5              # Virtual memory stats
sar -r                   # Memory utilization

# I/O monitoring
iotop                    # I/O by process
iostat -x 2             # Extended I/O statistics
sar -d                   # Disk activity

# Load monitoring
uptime                   # Load averages
sar -q                   # Queue length and load averages
```

### Network Performance
```bash
iftop                    # Network usage by connection
nethogs                 # Network usage by process
nload                    # Network load monitor
vnstat                   # Network statistics
ss -s                    # Socket statistics summary
```

## Automation & Scripting

### Cron & Task Scheduling
```bash
crontab -l               # List cron jobs
crontab -e               # Edit cron jobs
crontab -u user -e       # Edit user's cron jobs
systemctl status crond   # Check cron daemon status

# at command for one-time tasks
at now + 1 hour          # Schedule task for 1 hour from now
atq                      # List scheduled tasks
atrm job_number         # Remove scheduled task
```

### Environment Variables
```bash
env                      # Show all environment variables
printenv                 # Show all environment variables
echo $PATH              # Show specific variable
export VAR=value        # Set environment variable
unset VAR               # Remove environment variable
```

## Container & Orchestration Support

### Docker Commands (if using Docker)
```bash
docker ps                # List running containers
docker images            # List images
docker logs container    # View container logs
docker exec -it container bash  # Enter container
docker system df         # Docker disk usage
```

### Kubernetes Support Commands
```bash
# These support k8s troubleshooting
kubectl get pods         # (This is kubectl, but you need Linux skills)
curl -k https://api-server:6443/  # Test API server
openssl x509 -in cert.pem -text  # Examine certificates
```

## Text Processing for Configuration Management

### Advanced Text Processing
```bash
# Pattern matching
grep -r "pattern" /etc/  # Recursive search
egrep "pattern1|pattern2" file  # Multiple patterns
sed 's/old/new/g' file   # Replace text
awk '{print $1}' file    # Extract columns

# Configuration file editing
sed -i 's/old/new/g' config.conf  # In-place editing
awk '/pattern/ {print NR, $0}' file  # Line numbers with pattern

# JSON/YAML processing
jq '.key' file.json      # Parse JSON
yq '.key' file.yaml      # Parse YAML (if installed)
```

## Backup & Recovery

### Backup Operations
```bash
# tar backups
tar -czf backup.tar.gz /important/data  # Create compressed backup
tar -xzf backup.tar.gz   # Extract backup

# rsync backups
rsync -av --delete /source/ /backup/  # Incremental backup
rsync -av /local/ user@server:/backup/  # Remote backup

# Database backups
mysqldump -u user -p database > backup.sql  # MySQL backup
pg_dump database > backup.sql  # PostgreSQL backup
```

## Troubleshooting Tools

### System Debugging
```bash
strace -p PID            # Trace system calls
ltrace -p PID            # Trace library calls
ldd /path/to/binary      # Show shared library dependencies
file filename            # Determine file type
strings binary           # Extract strings from binary

# Network debugging
tcpdump -i any port 80   # Capture HTTP traffic
netstat -plant          # Show network connections with PIDs
ss -tulpn               # Modern netstat equivalent
```

### Resource Limits
```bash
ulimit -a               # Show all limits
ulimit -n 65536        # Set file descriptor limit
cat /proc/PID/limits   # Show process limits
```

## DevOps-Specific Workflows

### CI/CD Pipeline Support
```bash
# Git operations (commonly used in pipelines)
git clone repo          # Clone repository
git pull origin main    # Update code
git log --oneline -10   # Recent commits

# Build tools
make                    # Build using Makefile
mvn clean install      # Maven build (Java)
npm install            # Node.js dependencies
pip install -r requirements.txt  # Python dependencies

# Testing
curl -f http://localhost:8080/health  # Health check
wget --spider http://localhost:8080   # Test web service
```

### Infrastructure as Code Support
```bash
# Terraform support
terraform plan          # (This is terraform, but needs Linux skills)
terraform apply

# Ansible support
ansible-playbook -i inventory playbook.yml
ansible all -m ping -i inventory

# Configuration validation
nginx -t                # Test nginx config
apache2ctl configtest   # Test apache config
sshd -t                 # Test SSH config
```

## Essential DevOps Aliases & Shortcuts

### Commonly Used Aliases
```bash
# Add these to ~/.bashrc or ~/.bash_aliases
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'
alias grep='grep --color=auto'
alias df='df -h'
alias du='du -h'
alias free='free -h'
alias ps='ps aux'
alias ports='netstat -tulpn'
alias services='systemctl list-units --type=service'
alias logs='journalctl -f'
```

## Performance & Security Best Practices

### System Hardening Commands
```bash
# Security auditing
ss -tulpn               # Check listening ports
ps aux | grep root      # Check root processes
find / -perm -4000 2>/dev/null  # Find SUID files
find / -type f -perm 0777 2>/dev/null  # Find world-writable files

# Log monitoring for security
grep "Failed password" /var/log/auth.log
grep "sudo" /var/log/auth.log
journalctl _COMM=sshd --since "1 hour ago"
```

### Resource Optimization
```bash
# Clean up
apt autoremove          # Remove unnecessary packages
yum clean all          # Clean package cache
docker system prune    # Clean Docker resources
find /tmp -mtime +7 -delete  # Clean old temp files
```

This comprehensive list covers the essential Linux commands you'll need as a DevOps engineer. Focus on mastering system administration, monitoring, networking, and automation commands first, as these form the core of daily DevOps work.