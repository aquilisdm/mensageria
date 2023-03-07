module.exports = {
  apps : [{
    name   : "wpmessager",
    script : "./index.js",
    autorestart:true,
    watch: false,
    //instances : "max",
    exec_mode  : "fork",
    cron_restart: "5/120 * * * *",
    max_memory_restart: "500M",
    //node_args : "--harmony"
  }]
}
