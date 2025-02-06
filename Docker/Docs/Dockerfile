# initial layer
FROM node:17-alpine

# Initial the working directory
WORKDIR /app

# first dot for root folder and second dot is to which folder do i need to copy 
COPY  . .

RUN npm install

# on which port application will be run
EXPOSE 8000

# run the command after the run time
# this command will run the server main file

CMD ["node", "app.js"]

# now time to run this image
# - docker build -t my-app .
# `-t my-app` will give a name to this image and `.` will tell the relative path the the source code located 