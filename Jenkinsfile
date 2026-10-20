pipeline {
    agent any

    environment {
        DEPLOY_DIR  = '/var/www/html/api/task-abroad-api'
        PM2_NAME    = 'task-abroad-api'
        DEPLOY_PORT = '4000'
        SERVER_IP   = '3.25.151.231'
        S3_ENV_PATH = 's3://kiran-ec2-s3-lab-7f29c1/task-abroad-api/.env'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                dir('server') {
                    sh '''
                        set -eu
                        npm install
                    '''
                }
            }
        }

        stage('Test') {
            steps {
                dir('server') {
                    sh '''
                        set -eu
                        npm test
                    '''
                }
            }
        }
        
        stage('Setup MongoDB') {
            steps {
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: 'ssh-ec2-key',
                        keyFileVariable: 'SSH_KEY',
                        usernameVariable: 'SSH_USER'
                    )
                ]) {
                    sh '''
                        set -eu

                        SSH_OPTS="-i $SSH_KEY -p 22 \
                            -o BatchMode=yes \
                            -o StrictHostKeyChecking=yes"

                        ssh $SSH_OPTS "$SSH_USER@$SERVER_IP" 'bash -se' <<'REMOTE'
                            set -eu

                            if ! command -v mongod >/dev/null 2>&1; then
                                echo "MongoDB is not installed. Installing MongoDB Community 8.0..."

                                sudo apt-get update
                                sudo apt-get install -y gnupg curl

                                curl -fsSL https://pgp.mongodb.com/server-8.0.asc |
                                    sudo gpg --dearmor \
                                    -o /usr/share/keyrings/mongodb-server-8.0.gpg

                                echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" |
                                    sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list

                                sudo apt-get update
                                sudo apt-get install -y mongodb-org
                            else
                                echo "MongoDB is already installed."
                            fi

                            sudo systemctl enable --now mongod

                            for i in $(seq 1 15); do
                                if mongosh --quiet \
                                    "mongodb://127.0.0.1:27017/admin" \
                                    --eval 'db.runCommand({ ping: 1 }).ok' |
                                    grep -q '^1$'; then
                                    echo "MongoDB is ready."
                                    exit 0
                                fi
                                sleep 2
                            done

                            echo "MongoDB failed to become ready."
                            sudo systemctl status mongod --no-pager || true
                            exit 1
                    '''
                }
            }
        }

        stage('Deploy') {
            steps {
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: 'ssh-ec2-key',
                        keyFileVariable: 'SSH_KEY',
                        usernameVariable: 'SSH_USER'
                    )
                ]) {
                    sh '''
                        set -eu

                        SSH_OPTS="-i $SSH_KEY -p 22 \
                            -o BatchMode=yes \
                            -o StrictHostKeyChecking=no"

                        echo "Creating deployment directory..."
    
                        ssh $SSH_OPTS "$SSH_USER@$SERVER_IP" \
                            "sudo -n /usr/bin/mkdir -p '$DEPLOY_DIR'"

                        echo "Copying backend files..."

                        rsync -az \
                            -e "ssh -i $SSH_KEY -p 22 \
                                -o BatchMode=yes \
                                -o StrictHostKeyChecking=no" \
                            --exclude='.env' \
                            --exclude='node_modules/' \
                            "$WORKSPACE/server/" \
                            "$SSH_USER@$SERVER_IP:$DEPLOY_DIR/"

                        echo "Downloading .env from S3..."

                        ssh -i "$SSH_KEY" \
                            -p 22 \
                            -o BatchMode=yes \
                            -o StrictHostKeyChecking=no \
                            "$SSH_USER@$SERVER_IP" \
                            "aws s3 cp '$S3_ENV_PATH' '$DEPLOY_DIR/.env' &&
                            chmod 600 '$DEPLOY_DIR/.env'"

                        echo "Installing production dependencies and restarting..."

                        ssh $SSH_OPTS "$SSH_USER@$SERVER_IP" \
                            "cd '$DEPLOY_DIR' &&
                             npm install --omit=dev &&
                             if pm2 describe '$PM2_NAME' >/dev/null 2>&1; then
                                 pm2 restart '$PM2_NAME' --update-env;
                             else
                                 pm2 start src/server.js --name '$PM2_NAME';
                             fi &&
                             pm2 save"

                        echo "Waiting for the backend to start..."
                        sleep 3

                        echo "Verifying backend health on target server..."

                        ssh $SSH_OPTS "$SSH_USER@$SERVER_IP" \
                            "curl --fail --silent --show-error \
                             http://$SERVER_IP:$DEPLOY_PORT/api/health"

                        echo "Remote deployment and health check completed."
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'Deployment and verification successful.'
        }

        failure {
            echo 'Pipeline failed. Check the stage logs.'
        }
    }
}
