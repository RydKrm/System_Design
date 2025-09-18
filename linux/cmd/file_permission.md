# 1. Why Linux file permissions exist

Linux (and Unix) is a multi-user, multi-process operating system. File permissions are the basic mechanism that lets the system:

* Protect a user’s files from other users.
* Prevent ordinary processes from changing system files.
* Allow controlled sharing (via groups or finer controls).
* Limit what programs and device nodes can do.

In short: permissions are *discretionary access control (DAC)* — each file/directory has an owner and permissions that the owner (or root) can change. They are the first line of defense for system security and correct behavior.

# 2. Basic concepts — users, groups, others

* **User (owner)**: the account that owns the file (UID).
* **Group**: a group (GID) owning the file; users can belong to many supplementary groups.
* **Others**: everyone else.

Every file has an owner UID and GID stored in the inode.

# 3. The classic permission triad: r, w, x

For each of owner, group, others you have three bits:

* `r` (read):

  * File: read file contents.
  * Directory: list entries (ability to run `ls`).
* `w` (write):

  * File: modify contents.
  * Directory: create, rename, or remove entries (note: deletion also depends on directory permissions and sticky bit — more below).
* `x` (execute / search):

  * File: run as a program/script (if file is executable binary or script and kernel allows).
  * Directory: “search” the directory — enter it with `cd` and access items inside by name even if you can’t list them.

# 4. How permissions are shown and specified

`ls -l` example:

```
-rw-r--r-- 1 alice staff 1234 Jun 10 12:00 notes.txt
```

Breakdown:

* First char `-` = regular file (other options: `d` directory, `l` symlink, `c` char device, `b` block device, `s` socket, `p` FIFO).
* Next 9 chars = owner (3) | group (3) | others (3): `rw- r-- r--`.
* `1` link count; `alice` owner; `staff` group.

Numeric (octal) form: a single digit 0–7 per triad, where 4=r, 2=w, 1=x. Example:

* `rwx` = 7 (4+2+1)
* `rw-` = 6 (4+2)
  So `rwxr-xr--` → `755` → owner 7, group 5, others 5.

There is also a fourth (leftmost) octal digit for *special bits* (see next).

# 5. Special bits — setuid, setgid, sticky

These are stored as extra bits above the 9 classic bits.

* **setuid (S\_ISUID, octal 4000)**:

  * When set on an executable file, a process that executes it runs with the *effective UID* of the file owner (not the user who ran it).
  * Common historically for programs like `passwd` which need temporary root privileges.
  * Displayed as `s` in the owner execute position: e.g. `-rwsr-xr-x`. If owner execute is off but setuid is set, you’ll see `S` (capital).

* **setgid (S\_ISGID, octal 2000)**:

  * When set on a file executable, the process gets the effective GID of the file.
  * When set on a **directory**, new files created within inherit the directory’s group (useful for shared project directories).
  * Display shows `s` (or `S`) in the group execute position.

* **sticky bit (S\_ISVTX, octal 1000)**:

  * Historically used on executables; today used mainly on directories.
  * On a directory: users can only delete files they own (or root), even if the directory is world-writable. `/tmp` is typically `drwxrwxrwt` (the `t` denotes sticky).
  * Display: `t` if the others execute bit is on, `T` if others execute is off.

Examples of full mode numbers:

* `1777` → `rwxrwxrwt` (world-writable with sticky — `/tmp` style).
* `2750` → setgid + `rwxr-s---`.

# 6. How the kernel checks permissions (brief, accurate)

When a process attempts to open/read/write/execute a file, the kernel performs checks roughly in this order:

1. Determine the process credentials: **effective UID (EUID)**, **effective GID (EGID)**, and **supplementary groups**.
2. If EUID == file owner UID → check the owner triad (r/w/x).
3. Else if any of process groups match file GID → check the group triad.
4. Else → check the others triad.

Special notes:

* The **root** user (UID 0) is special: it bypasses most of these checks (root can usually read/write/execute regardless of bits), but there are exceptions (immutable flags, certain security modules).
* `access(2)` syscall behaves differently: it checks permissions against the **real** UID/GID (not effective) — used to test whether the real user would have access.
* Setuid/setgid influence the *effective* credentials after `execve()`.

# 7. umask — how default permissions are decided

When a process creates a file, the requested mode is filtered by the process’s **umask**. The formula:

```
actual_mode = requested_mode & ~umask
```

Common behavior:

* Many programs request `0666` for files (read/write for owner/group/others) and `0777` for directories. The kernel or library calls then apply the umask to remove bits.
* Example: umask `022`

  * New file: `0666 & ~0022 = 0644` (owner rw, group r, others r)
  * New dir: `0777 & ~0022 = 0755` (owner rwx, group rx, others rx)

Set a user umask in shell config (`umask 002` for collaborative group write access).

# 8. Extended / fine-grained controls

## POSIX ACLs

* When base permissions are insufficient you can use POSIX ACLs (`setfacl`, `getfacl`) to give specific privileges to particular users or groups.
* For example `setfacl -m u:bob:rwx file` grants user `bob` rwx, even if `bob` is not the owner or in the file’s group.
* ACL entries are stored as extended metadata (xattrs) by filesystems that support them (ext4, XFS, btrfs).

## Mandatory Access Control (MAC)

* Systems like **SELinux** or **AppArmor** impose additional rules outside the classic permission bits.
* MAC is *mandatory* — even if DAC (Unix bits) permit access, SELinux policy may deny it. They provide much finer, label-based policies for system enforcement.
* Use `ls -Z` to see SELinux contexts; `getenforce` shows SELinux mode.

# 9. Device files (you said “devy” — I assume device files)

Device files (nodes) live under `/dev`. They are not regular data files — they are interfaces to kernel drivers.

* Two main types:

  * **Character device** (`c`): byte-oriented (e.g., `/dev/tty`, serial ports).
  * **Block device** (`b`): block-oriented (e.g., `/dev/sda`).
* Example `ls -l /dev/sda`:

  ```
  brw-rw---- 1 root disk 8, 0 Jul 12 12:34 /dev/sda
  ```

  * `b` – block device.
  * `root disk` – owner root, group disk.
  * `8, 0` – major (8) and minor (0) device numbers. Major selects driver, minor selects device instance.

Device node permissions control *who can talk to the device*: for example `crw-rw---- root dialout /dev/ttyUSB0` means only users in `dialout` group can access that USB serial.

Device nodes are usually created dynamically by `udev`; `mknod` can create them manually (requires root and proper major/minor).

# 10. Some implementation details

* The permission bits, along with special bits and type, are stored in the inode’s `st_mode` field.

  * The lower 9 bits = owner/group/other `rwx`.
  * Above these are `setuid`, `setgid`, `sticky`.
  * Above those are file type bits (`S_IFREG`, `S_IFDIR`, `S_IFCHR`, ...).
* `chmod(2)`, `fchmod(2)` change bits. `chown(2)` changes ownership (subject to privileges).
* Changing ownership to another user typically requires `CAP_CHOWN` or root.

# 11. Common commands / quick cheatsheet

* `ls -l filename` — show permissions and owner/group.
* `stat -c "%A %a %n" file` — show symbolic and octal modes.
* `chmod 0755 file` or `chmod u=rwx,g=rx,o=rx file` — change permissions.
* `chown alice:staff file` — change owner and group.
* `umask` — show or set current shell umask.
* `getfacl file` / `setfacl -m u:bob:rw file` — get/set ACLs.
* `ls -ld /tmp` — observe sticky: typically `drwxrwxrwt`.

# 12. Examples (practical scenarios)

1. **Private notes**:

   * `chmod 600 notes.txt` → `-rw-------` → only owner can read/write.
2. **Web server public files**:

   * Files owned by `www-data:www-data`, `chmod 644` for files, `chmod 755` for dirs.
3. **Shared project directory**:

   * Create directory: `mkdir /srv/project && chgrp developers /srv/project && chmod 2775 /srv/project`
   * `2` sets setgid: new files inherit `developers` group. `775` gives group write access.
4. **/tmp behavior**:

   * `drwxrwxrwt` ensures anyone can create files, but only the owner (or root) can delete them.

# 13. Best practices and guidance

* Follow the *principle of least privilege*: give the minimum permissions needed.
* Prefer **groups** (and setgid on project dirs) over making files world-writable.
* Avoid **setuid root** binaries unless absolutely necessary — they are a common security risk.
* Use **capabilities** (Linux capabilities) instead of setuid root when you need a limited privilege (e.g., `CAP_NET_BIND_SERVICE` for binding low ports).
* Use **ACLs** when you need per-user fine control, but keep the basic bits understandable.
* Combine DAC (traditional bits) with MAC (SELinux/AppArmor) on servers for layered defense.

# 14. Short summary

* Classic Linux permissions are simple and powerful: owner/group/others × r/w/x.
* Special bits (setuid, setgid, sticky) add useful behaviors.
* `umask` controls default created permissions.
* ACLs and MAC extend control when needed.
* Device node permissions in `/dev` gate hardware and kernel interfaces.
* Use groups and careful policy to keep systems secure.
Alright, let’s pick three concrete scenarios where permissions matter and walk through them with `chmod` and `setfacl` commands. You’ll see how the “book rules” meet real-world needs.

---

## **1. Team Project Directory (Shared Group Access)**

Imagine a dev team all in the `developers` group. They need a shared folder where:

* Everyone in the group can read/write.
* Files created inside should automatically belong to the group.
* Nobody outside the team should peek.

```bash
# Create the project dir
sudo mkdir /srv/project

# Assign ownership: root:developers (group is developers)
sudo chown root:developers /srv/project

# Give owner/group rwx, remove access from others
sudo chmod 2770 /srv/project
```

* `2` in `2770` → setgid: new files inherit the `developers` group.
* `770` → only owner and group have full access.

Now, if you want Alice (not in `developers`) to also collaborate:

```bash
# Allow Alice to read/write even though she isn’t in developers group
sudo setfacl -m u:alice:rwx /srv/project
```

Check:

```bash
getfacl /srv/project
```

---

## **2. Web Server Files (Safe Read-Only for Visitors)**

Say you’re serving files with Nginx, running as user `www-data`. You want:

* `www-data` (the web server) to read the files.
* Only the admin (you) to modify them.
* Nobody else should touch them.

```bash
# Files owned by you, group set to www-data
sudo chown riyad:www-data /var/www/site/index.html

# Owner rw, group r, others none
sudo chmod 640 /var/www/site/index.html
```

If you want the entire `/var/www/site` tree to follow this rule:

```bash
sudo chown -R riyad:www-data /var/www/site
sudo chmod -R 750 /var/www/site
```

Now `www-data` can read, but can’t alter. Visitors only see what the web server serves.

---

## **3. Device Access (Serial Port for IoT Project)**

Suppose you plug in a USB serial device (`/dev/ttyUSB0`) and want user `alice` (not root) to use it.

```bash
ls -l /dev/ttyUSB0
# Example output: crw-rw---- 1 root dialout 188, 0 Sep 18 12:34 /dev/ttyUSB0
```

* It belongs to `root:dialout`.
* Only users in group `dialout` can read/write.

Add Alice to the group:

```bash
sudo usermod -aG dialout alice
```

Then she can unplug/replug and use the device without sudo.

If you want *just Alice* (and not the whole dialout group) to access this one device:

```bash
sudo setfacl -m u:alice:rw /dev/ttyUSB0
```

(Remember: device nodes are recreated at boot or replug, so this should be handled with `udev` rules if permanent.)

---