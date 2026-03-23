# API Documentation

## Authentication

### Endpoint: `/api/auth/login`
- **Method**: POST  
- **Description**: Authenticate user and return a JWT token.  
- **Request Body**:  
  - `username`: string, required  
  - `password`: string, required  
- **Response**:
  - `200 OK`: Returns a JWT token
  - `401 Unauthorized`: Invalid credentials


### Endpoint: `/api/auth/logout`
- **Method**: POST  
- **Description**: Logout user and invalidate the token.  
- **Response**:  
  - `200 OK`: Logout successful


## Student Dashboard

### Endpoint: `/api/students/dashboard`
- **Method**: GET  
- **Description**: Retrieve the student dashboard data.  
- **Request Headers**: 
  - `Authorization`: Bearer token  
- **Response**:
  - `200 OK`: Returns student data (courses, grades, assignments, etc.)
  - `403 Forbidden`: Unauthorized access


### Endpoint: `/api/students/assignments`
- **Method**: GET  
- **Description**: Get a list of assignments for the student.  
- **Request Headers**: 
  - `Authorization`: Bearer token  
- **Response**:
  - `200 OK`: Returns a list of assignments
  - `403 Forbidden`: Unauthorized access


## Admin Dashboard

### Endpoint: `/api/admin/dashboard`
- **Method**: GET  
- **Description**: Retrieve the admin dashboard data.  
- **Request Headers**: 
  - `Authorization`: Bearer token  
- **Response**:
  - `200 OK`: Returns admin data (user management, analytics, system status)
  - `403 Forbidden`: Unauthorized access

### Endpoint: `/api/admin/users`
- **Method**: GET  
- **Description**: Get a list of all users in the system.  
- **Request Headers**: 
  - `Authorization`: Bearer token  
- **Response**:
  - `200 OK`: Returns a list of users
  - `403 Forbidden`: Unauthorized access

### Endpoint: `/api/admin/users/{id}`
- **Method**: DELETE  
- **Description**: Delete a specific user by ID.  
- **Request Headers**:
  - `Authorization`: Bearer token  
- **Response**:
  - `204 No Content`: User deleted successfully
  - `404 Not Found`: User not found

## Note
- Make sure to handle errors appropriately at each endpoint.
- Authentication is required for accessing dashboard endpoints.