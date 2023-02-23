module.exports = {
  apps : [{
    name   : "wpmessager",
    script : "./index.js",
    autorestart:true,
    watch: false,
    exec_mode  : "fork"
  }]
}
