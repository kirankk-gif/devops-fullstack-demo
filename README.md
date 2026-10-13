# DevOps Full-Stack Demo: Task Board

React + Vite frontend, Node.js + Express backend, MongoDB database.

## Run backend
Requirements: Node.js 20+ and MongoDB.
```bash
cd server
cp .env.example .env
npm install
npm run dev
```
Edit `server/.env` and set `MONGODB_URI`. Health check: `curl http://localhost:5000/api/health`.

## Run frontend (second terminal)
```bash
cd client
npm install
npm run dev
```
Open the Vite URL, usually http://localhost:5173. Vite proxies `/api` to port 5000.

## Deploy backend
Copy `server/` to the server, configure `server/.env`, then:
```bash
cd server
npm ci
npm start
```
For Nginx on the same machine, use `HOST=127.0.0.1`. Run with PM2 if desired:
```bash
sudo npm install -g pm2
pm2 start src/server.js --name task-board-api
pm2 save
pm2 startup
```
Run the command printed by `pm2 startup` if requested.

## Deploy frontend
```bash
cd client
npm ci
npm run build
```
Copy `client/dist/` contents to `/var/www/html/task-board/`.

Example Nginx config is in `nginx/task-board.conf`. It listens on port 8083, serves the frontend, and proxies `/api/` to `127.0.0.1:5000`. Review paths/ports before enabling:
```bash
sudo cp nginx/task-board.conf /etc/nginx/sites-available/task-board
sudo ln -s /etc/nginx/sites-available/task-board /etc/nginx/sites-enabled/task-board
sudo nginx -t
sudo systemctl reload nginx
```
If the symlink already exists, don't create it again. Choose a free port and do not overwrite existing Nginx/GitLab configuration without checking it.

## API
- `GET /api/health` health and DB status
- `GET /api/tasks` list tasks
- `POST /api/tasks` create task (`{"title":"Learn Jenkins"}`)
- `PATCH /api/tasks/:id` update title/completed
- `DELETE /api/tasks/:id` delete task

Keep `.env` out of Git and store production secrets in Jenkins Credentials or your approved secret manager.
