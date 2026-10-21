pipeline {
    agent any

    environment {
        SERVER_IP  = '3.106.194.176'
        DEPLOY_USER = 'ubuntu'

        FRONTEND_DIR = '/var/www/html/devops-task/app'
        BACKEND_DIR  = '/var/www/html/devops-task/api'

        PM2_NAME = 'devops-task-api'
        DEPLOY_PORT = '4000'

        // Replace this with the correct .env object for this project.
        S3_ENV_PATH = 's3://kiran-ec2-s3-lab-7f29c1/task-abroad-api/.env'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Check Jenkins Requirements') {
            steps {
                sh '''
                    set -eu

                    for cmd in git node npm ssh rsync; do
                        command -v "$cmd" >/dev/null || {
                            echo "Missing requirement: $cmd"
                            exit 1
                        }
                    done

                    node --version
                    npm --version
                    git --version
                    ssh -V
                    rsync --version | head -n 1

                    test -f client/package.json
                    test -f server/package.json

                    echo "Jenkins requirements checked."
                '''
            }
        }

        stage('Build Frontend') {
            steps {
                dir('client') {
                    sh '''
                        set -eu
                        npm ci
                        npm run build
                        test -d dist
                        test -f dist/index.html
                    '''
                }
            }
        }

        stage('Test Backend') {
            steps {
                dir('server') {
                    sh '''
                        set -eu
                        npm ci
                        npm test
                    '''
                }
            }
        }

        stage('Check EC2 Requirements') {
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

                        SSH_OPTS="-i $SSH_KEY \
                          -o BatchMode=yes \
                          -o StrictHostKeyChecking=yes"

                        ssh $SSH_OPTS "$SSH_USER@$SERVER_IP" '
                            set -eu
                            for cmd in node npm aws pm2 nginx; do
                                command -v "$cmd" >/dev/null || {
                                    echo "Missing EC2 requirement: $cmd"
                                    exit 1
                                }
                            done

                            node --version
                            npm --version
                            aws --version
                            pm2 --version
                            nginx -v
                        '
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

                        SSH_OPTS="-i $SSH_KEY \
                          -o BatchMode=yes \
                          -o StrictHostKeyChecking=yes"

                        echo "Preparing deployment directories..."

                        ssh $SSH_OPTS "$SSH_USER@$SERVER_IP" \
                          "sudo -n mkdir -p '$FRONTEND_DIR' '$BACKEND_DIR'"

                        echo "Copying frontend dist..."

                        rsync -az --delete \
                          -e "ssh $SSH_OPTS" \
                          client/dist/ \
                          "$SSH_USER@$SERVER_IP:/tmp/devops-task-dist/"

                        ssh $SSH_OPTS "$SSH_USER@$SERVER_IP" \
                          "sudo -n rsync -a --delete \
                           /tmp/devops-task-dist/ '$FRONTEND_DIR/'"

                        echo "Copying backend source..."

                        rsync -az \
                          -e "ssh $SSH_OPTS" \
                          --exclude='.env' \
                          --exclude='node_modules/' \
                          server/ \
                          "$SSH_USER@$SERVER_IP:/tmp/devops-task-api/"

                        echo "Deploying backend and environment..."

                        ssh $SSH_OPTS "$SSH_USER@$SERVER_IP" '
                            set -eu

                            sudo -n rsync -a \
                              --exclude=".env" \
                              /tmp/devops-task-api/ \
                              "'"$BACKEND_DIR"'/"

                            # Download secrets directly on EC2.
                            sudo -n aws s3 cp \
                              "'"$S3_ENV_PATH"'" \
                              "'"$BACKEND_DIR"'/.env"

                            sudo -n chmod 600 "'"$BACKEND_DIR"'/.env"

                            cd "'"$BACKEND_DIR"'"

                            # Install production dependencies on EC2.
                            sudo -n npm ci --omit=dev

                            # Confirm that the required environment values exist
                            # without printing secret values.
                            sudo -n node -e "
                              require('dotenv').config();
                              if (!process.env.MONGODB_URI ||
                                  !process.env.JWT_SECRET) {
                                console.error('Required environment variable missing');
                                process.exit(1);
                              }
                              console.log('Required environment variables exist');
                            "

                            # Start or restart the API.
                            if sudo -n pm2 describe "'"$PM2_NAME"'" >/dev/null 2>&1; then
                                sudo -n pm2 restart "'"$PM2_NAME"'" --update-env
                            else
                                sudo -n pm2 start src/server.js \
                                  --name "'"$PM2_NAME"'"
                            fi

                            sudo -n pm2 save
                        '

                        echo "Checking backend health..."

                        sleep 3

                        ssh $SSH_OPTS "$SSH_USER@$SERVER_IP" \
                          "curl --fail --silent --show-error \
                           http://127.0.0.1:$DEPLOY_PORT/api/health"

                        echo "Checking public website..."

                        curl --fail --silent --show-error \
                          "http://$SERVER_IP/" >/dev/null

                        echo "Deployment and basic health checks passed."
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'Deployment completed successfully.'
        }
        failure {
            echo 'Deployment failed. Review the failed stage logs.'
        }
    }
}
