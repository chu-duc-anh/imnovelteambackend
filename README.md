
# IMnovel Team Backend

This is the Node.js, Express, and MongoDB backend for the IMnovel Team application.

## Prerequisites

- Node.js (v18 or higher recommended)
- npm
- MongoDB (local instance or a cloud service like MongoDB Atlas)

## Setup and Installation

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create an environment file:**
    Create a `.env` file in the `backend` directory by copying the example file:
    ```bash
    cp .env.example .env
    ```

4.  **Configure environment variables:**
    Open the newly created `.env` file and fill in the required values:
    -   `PORT`: The port for the backend server to run on (e.g., 5001).
    -   `MONGO_URI`: Your MongoDB connection string.
        -   For a local instance: `mongodb://127.0.0.1:27017/imnovel`
        -   For MongoDB Atlas, get the connection string from your cluster dashboard.
    -   `JWT_SECRET`: A long, random, secret string used for signing JSON Web Tokens.

## Running the Server

### Development Mode

For development, it's recommended to use `nodemon`, which will automatically restart the server when you make changes to the code.

```bash
npm run server
```

The server will start on the port specified in your `.env` file (e.g., `http://localhost:5001`).

### Production Mode

To run the server in a production environment:

```bash
npm start
```

## API Structure

The API endpoints are organized by resource.

-   `/api/users`: Authentication and user management.
-   `/api/stories`: Story creation, retrieval, and management.
-   `/api/comments`: Commenting on stories and chapters.
-   `/api/chats`: Direct messaging and global chat.

Authentication is handled via JWTs. Protected routes require a valid `Authorization: Bearer <token>` header.
