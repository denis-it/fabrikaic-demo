# Build instructions here:
# http://jdlm.info/articles/2016/03/06/lessons-building-node-app-docker.html

FROM node

RUN apt-get update \
  && apt-get install -y avrdude --no-install-recommends \
  && useradd --user-group --create-home --shell /bin/false fabrikaic-demo \
  && curl -L https://npmjs.org/install.sh | sh

ENV HOME=/home/fabrikaic-demo

COPY package.json npm-shrinkwrap.json $HOME/data/
RUN usermod -a -G dialout fabrikaic-demo \
  && chown -R fabrikaic-demo:fabrikaic-demo $HOME/*

USER fabrikaic-demo
WORKDIR $HOME/data
RUN npm install \
  && npm cache clean

USER root
COPY . $HOME/data
RUN chown -R fabrikaic-demo:fabrikaic-demo $HOME/*
USER fabrikaic-demo

CMD ["node", "main.js"]
