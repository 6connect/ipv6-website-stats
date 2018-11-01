#goes in /etc/nginx/sites-enabled/default
server {
    server_name ipv6-only.your-domain.com;

    listen [::]:80 ipv6only=on;
    listen [::]:443 ssl ipv6only=on;
    add_header 'Access-Control-Allow-Origin' '*';
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
    add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range';

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header x-ipv6-forced 'true';
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
     }
}


server {
    server_name ipv6.your-domain.com;

    listen [::]:80;
    listen 80;
    listen [::]:443 ssl;
    listen 443 ssl;

    add_header 'Access-Control-Allow-Origin' '*';
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
    add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range';


    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
     }
    location /gui {
        alias /var/www/gui/6connect/6connect-ipv6-gui/dist/;
        index index.html index.htm index.nginx-debian.html;
        try_files $uri $uri/ /index.html;
    }

}
