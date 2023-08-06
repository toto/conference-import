#!/bin/sh
ssh api.conference.systems 'cd conference-import && git pull && cd ~ && ./import.sh'