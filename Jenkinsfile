pipeline {
    agent any

    environment {
        DEPLOY_DIR = '/var/www/html/api/task-board-api'
        PM2_NAME   = 'task-board-api'
        DEPLOY_PORT = '4000'
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
                sh '''
                    set -e

                    mkdir -p "$DEPLOY_DIR"

                    # Copy application files without replacing
                    # the server's .env or copying node_modules.
                    rsync -a \
                        --exclude='.env' \
                        --exclude='node_modules/' \
                        "$DEPLOY_DIR/"

                    cd "$DEPLOY_DIR"

                    # Install production dependencies.
                    npm install --omit=dev

                    # Start the app if absent; otherwise restart it.
                    if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
                        pm2 restart "$PM2_NAME" --update-env
                    else
                        pm2 start src/server.js \
                            --name "$PM2_NAME"
                    fi

                    pm2 save
                '''
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
