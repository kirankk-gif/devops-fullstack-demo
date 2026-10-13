pipeline {
    agent any

    environment {
        DEPLOY_DIR = '/home/jenkins/apps/task-board/server'
        PM2_NAME   = 'task-board-api'
        DEPLOY_PORT = '4000'
        USER = 'kiran'
        SERVER_IP = '192.168.0.84'
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
                        set -e
                        npm install
                    '''
                }
            }
        }

        stage('Test') {
            steps {
                dir('server') {
                    sh '''
                        set -e
                        npm test
                    '''
                }
            }
        }

        stage('Deploy') {
            steps {
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: 'ssh-kiran-key',
                        keyFileVariable: 'SSH_KEY',
                        usernameVariable: 'SSH_USER'
                    )
                ]) {
                    sh '''
                        set -e

                        echo "Creating deployment directory on production server..."

                        ssh -i "$SSH_KEY" \
                            -p 2222 \
                            -o BatchMode=yes \
                            -o StrictHostKeyChecking=yes \
                            "$SSH_USER@$SERVER_IP" \
                            'sudo -n /usr/bin/mkdir -p /var/www/html/api/task-board-api'

                        echo "Copying application files..."

                        rsync -az \
                            -e "ssh -i $SSH_KEY -p 2222 -o BatchMode=yes -o StrictHostKeyChecking=yes" \
                            --exclude='.env' \
                            --exclude='node_modules/' \
                            "$DEPLOY_DIR/" \
                            "$SSH_USER@$SERVER_IP:/var/www/html/api/task-board-api/"

                        echo "Installing production dependencies and restarting application..."

                        ssh -i "$SSH_KEY" \
                            -p 2222 \
                            -o BatchMode=yes \
                            -o StrictHostKeyChecking=yes \
                            "$SSH_USER@$SERVER_IP" \
                            'cd /var/www/html/api/task-board-api &&
                            npm install --omit=dev &&
                            if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
                                pm2 restart "$PM2_NAME" --update-env;
                            else
                                pm2 start src/server.js --name "$PM2_NAME";
                            fi &&
                            pm2 save'
                    '''
                }
            }
        }

        stage('Verify') {
            steps {
                sh '''
                    set -e
                    sleep 2

                    curl --fail --silent --show-error \
                        "http://127.0.0.1:${DEPLOY_PORT}/api/health"
                '''
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
