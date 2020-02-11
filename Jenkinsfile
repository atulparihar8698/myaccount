
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
  stage('Deploy to kubernetes') {
    dockerImage = docker.remove("atulparihar869813/myaccount:latest")
  }  

}
