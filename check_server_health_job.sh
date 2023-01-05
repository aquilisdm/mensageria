#!/bin/bash
output=$(curl -s -I http://172.16.0.4:2000/wp-config/checkServerHealth | head -n 1| cut -d $' ' -f2)

if test -z "$output" || test "$output" = "404";
  then
  if ! screen -list | grep -q "^wpmsg$"; then
    screen -d -m -S wpmsg node /mnt/prod/wpmessager/index.js
   
    if test -d "/mnt/prod/wpmessager/crash_logs/"; then
      echo ""
    else
      mkdir /mnt/prod/wpmessager/crash_logs/
    fi
    
    date +"%Y-%m-%d"
    date "+%T"
    currentDate=$(date +"%Y-%m-%d")
    currentTime=$(date "+%T")
    echo "restarting server [reason:Server was down...]" > /mnt/prod/wpmessager/crash_logs/"start_log_$currentDate$currentTime.txt"
  fi
fi