# What is Authentication?

**Authentication** is the process of verifying the identity of a user, system, or device to confirm that they are who they claim to be. It’s the first step in securing any system, ensuring that only authorized users can access certain resources or services.

In simple terms, **authentication** answers the question:
**"Who are you?"**

## Key Concepts in Authentication:

1. **Credentials**: Information provided by the user to prove their identity. This can be a username and password, fingerprint, smart card, etc.
2. **Authentication Factors**: These are the different types of information used to verify identity. They are generally grouped into three categories:

   - **Something You Know**: A password or PIN.
   - **Something You Have**: A physical token like a smart card or a mobile phone.
   - **Something You Are**: Biometrics like fingerprints or facial recognition.

3. **Authentication Process**:
   - The user presents their credentials (e.g., enters their username and password).
   - The system verifies these credentials against stored data.
   - If the credentials are valid, access is granted; otherwise, access is denied.

## Types of Authentication:

1. **Single-Factor Authentication (SFA)**:
   - Uses only one factor, typically a password. It’s simple but less secure.
2. **Multi-Factor Authentication (MFA)**:

   - Requires two or more factors to authenticate the user, for example:
     - A password (something you know).
     - A verification code sent to your phone (something you have).
   - This adds an extra layer of security, making it harder for attackers to gain unauthorized access.

3. **Two-Factor Authentication (2FA)**:

   - A common type of MFA that uses two factors to authenticate, like a password and a mobile verification code.

4. **Token-Based Authentication**:
   - After initial authentication, the server issues a token (like a JWT) that the user can use for subsequent requests without having to re-enter credentials.

# What is Authorization?

**Authorization** is the process of determining whether a user or system has the necessary permissions to access specific resources or perform certain actions. After authentication (which verifies identity), authorization controls what an authenticated user can do within the system.

In simple terms, **authorization** answers the question:  
**"What are you allowed to do?"**

## Key Concepts in Authorization:

1. **Permissions**:
   - Permissions define what actions a user is allowed to perform, such as reading, writing, deleting, or modifying resources.
2. **Roles**:

   - Roles are groups of permissions that can be assigned to users. For example, a user may have a role like "Admin" or "Editor," which allows them to perform specific actions.

3. **Access Control Lists (ACLs)**:

   - ACLs define which users or systems are granted access to certain resources. Each resource has a list of who can access it and what they are allowed to do (e.g., read, write, execute).

4. **Policy-Based Access Control (PBAC)**:

   - PBAC uses rules or policies to determine what users can do. These policies might consider various factors like user attributes, resource attributes, or environmental conditions.

5. **Least Privilege**:
   - A security principle that dictates that users should only have the minimum permissions necessary to perform their tasks, reducing the risk of misuse or accidental damage.

## Types of Authorization:

1. **Role-Based Access Control (RBAC)**:

   - Users are assigned specific roles, and each role has a set of permissions. For example, an "Admin" may have full access to all resources, while a "User" may have limited access.
   - Example:

   - A company has an internal system where employees are assigned specific roles.
   - "Admin" role: Can create, edit, and delete documents across all departments.
   - "Manager" role: Can only create and edit documents in their department.
   - "Employee" role: Can only view documents and cannot edit or delete them.
   - Users are assigned roles based on their job function, and their access rights are determined by the role they hold.

2. **Attribute-Based Access Control (ABAC)**:

   - In ABAC, access is granted based on attributes (e.g., department, job title) rather than just roles. This provides more fine-grained control.
   - Example:

   - An organization's document management system uses user attributes (like department, job title, and location) to decide access.
   - A user with the attribute "Department: HR" and "Title: Manager" can access HR-related documents but cannot view documents from other departments.
   - A user working remotely from a certain location may be restricted from accessing confidential documents, even if they have the appropriate role.

3. **Discretionary Access Control (DAC)**:

   - Resource owners can control access to their resources by granting or revoking permissions at their discretion.
   - Discretionary Access Control (DAC):

   - Example:
   - In a shared folder environment, the file owner has the power to determine who can access their files.
   - A team member creates a project document and decides to give read and write permissions to specific colleagues.
   - The owner can modify the permissions at any time, allowing or revoking access to their files for other users in the system.

4. **Mandatory Access Control (MAC)**:
   - Access is determined by system-wide policies, and individual users cannot change the permissions of resources they own.
   - Example:
   - A government agency follows strict security protocols where access to sensitive data is based on classification levels like "Confidential," "Secret," and "Top Secret."
   - Each user is assigned a security clearance level, and they can only access data that matches or is below their clearance.
   - Unlike DAC, users cannot change access control policies for the resources they work with. The system-wide policies determine access.

## Authorization Process

1. **User Authenticates**:
   - The user logs in, and their identity is verified through the authentication process.
2. **System Checks Permissions**:
   - Once the user is authenticated, the system checks if they have the necessary permissions to access the requested resource or perform the action.
3. **Access Granted or Denied**:
   - If the user has the appropriate permissions, access is granted; otherwise, it is denied.

## Authorization vs Authentication

- **Authentication**: Verifies **who** the user is.
- **Authorization**: Determines **what** the authenticated user is allowed to do.

For example:

- Authentication checks if a user is "JohnDoe."
- Authorization checks if "JohnDoe" has permission to delete a file.

## Examples of Authorization in Action:

1. **Web Applications**:
   - An authenticated user may be allowed to view their profile page (authorization to read data) but not allowed to edit other users' profiles.
2. **APIs**:

   - An API may allow authenticated users to retrieve data but require admin privileges to modify or delete data.

3. **File System Permissions**:
   - A file may have read, write, or execute permissions, and only users with the correct authorization can perform these actions.

---

Authorization is an essential layer of security that defines what authenticated users can access and modify within a system.

## Authentication vs Authorization

- **Authentication**: Verifies **who** the user is.
- **Authorization**: Determines **what** the authenticated user is allowed to do.

For example:

- Authentication checks if a user is "JohnDoe."
- Authorization checks if "JohnDoe" can access a specific file or perform a specific action.

---

Authentication is the foundation of security, ensuring that only verified users can access a system or resource.
