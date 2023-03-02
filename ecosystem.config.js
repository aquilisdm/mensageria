module.exports = {
  apps : [{
    name   : "wpmessager",
    script : "./index.js",
    autorestart:true,
    watch: false,
    instances : "2",
    exec_mode  : "cluster",
    //cron_restart: "5/120 * * * *",
    max_memory_restart: "500M",
    node_args : "--harmony --expose-gc"
  }]
}
