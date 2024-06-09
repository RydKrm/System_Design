# use an exist docker image as a base
FROM alpine 
# download and install dependancy
RUN apk add --update redis
# tell the image what to do when it starts
# as a container
CMD ["redis-server"]
