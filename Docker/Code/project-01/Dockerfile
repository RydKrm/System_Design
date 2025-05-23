# initial layer
FROM node:20-alpine

# install nodemon globally
RUN npm install -g nodemon

# Initial the working directory
WORKDIR /app

# First copy package.json file so that after every run not npm install going to run 
COPY  ./package.json ./

RUN npm install
# first dot for root folder and second dot is to which folder do i need to copy 
# This will only copy the full project, but not install the package every time
COPY ./ ./

# on which port application will be run
EXPOSE 8000

# run the command after the run time
# this command will run the server main file

CMD ["npm", "run", "dev"]

# now time to run this image
# - docker build -t my-app .
# `-t my-app` will give a name to this image and `.` will tell the relative path the the source code located 