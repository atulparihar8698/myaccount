
node {

  checkout scm
  def dockerImage

  stage('Build image') {
    dockerImage = docker.build("atulparihar869813/myaccount:latest")
  }

  stage('Push image') {
    docker.withRegistry('https://registry-1.docker.io/latest/','docker-hub') {
      dockerImage.push()
    }
  } 
  state('Deployment to kubernetes') {
    sh ***
      ./init.sh prod dtr.caleb.boxboat.net latest
    ***
  }
}
