## IPv6 vs IPv4 Statistics
This project was created to track the real-world utilization of IPv6 by testing to see if site visitors are able to utilize IPv6 networking.

It's a simple solution where a script on your website sends a GET request to a domain with an `AAAA` record (no `A` record, IPv6 address only) to see if the client supports IPv6 traffic. If the request fails, it sends another request to an IPv4 domain so the server can record how many clients don't support IPv6 traffic, in addition to how many can support it.

## Getting started

***You'll need***
 - Basic experience using linux and SSH
 - A website with some traffic you want to test
 - A domain on which you can configure sub-domains
 - $5 a month for a VPS from DigitalOcean (or similar service)


## Setting up the server
>We used a DigitalOcean VPS, you don't have to, however, your VPS will need to be capable of IPv6 networking.

Create an Ubuntu 18.04 x64 VPS with 1 vCPU and 1GB of ram.
Make sure you check the box that enables IPv6 networking (off by default on DigitalOcean). If you don't check this then you won't get any IPv6 traffic to your VPS.

<kbd>
    <img src="assets/images/choose-ipv6.PNG?raw=true" width="500">
</kbd>
 
It will take up to a minute or two for DigitalOcean to spin up your VPS. After it's finished, DigitalOcean should give you instructions on how to finish setting it up and configuring a password. Follow the instructions and once you've SSH'd into your server, proceed to the next step.

## MongoDB

These steps are pulled from [this guide created by DigitalOcean](https://www.digitalocean.com/community/tutorials/how-to-install-mongodb-on-ubuntu-18-04) for version 18.04 of Ubuntu.

Make sure your system is up to date

```
apt-get update
```

Now we'll install MongoDB

```
apt install -y mongodb
```

This will install all the necessary packages and start the MongoDB service. If you need to check the status of the service, you can type `systemctl status mongodb` to ensure it's up and running.

## NodeJS / NPM
These steps are pulled from [this guide created by DigitalOcean](https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-ubuntu-18-04) for version 18.04 of Ubuntu.

Install NodeJS and NPM

```
apt install nodejs
```

```
apt install npm
```

After NodeJS and NPM finish installing, type `node -v` to ensure that everything is installed properly. We're running on Node v8.10.0, but using fairly standard libraries so if your version if off it shouldn't matter that much.


## Setting up the Project
Now it's time to clone our project files, move to the base directory
```
cd ~
```

Download our project files
```
git clone https://github.com/CircleClick/6connect-ip-statistics
```

Move into the directory with our project files
```
cd 6connect-ip-statistics
```

Install project dependencies from NPM
```
npm i
```

After npm finishes, you should be able to test to see if the project works by running the script
```
node app.js
```
And then you should see an output like this
```
{ ipv4: { mobile: 0, tablet: 0, desktop: 0 },
  ipv6: { mobile: 0, tablet: 0, desktop: 0 },
  init: false }
```
This confirms that the project is up and running. You might see a couple of `DeprecationWarning` notices but those are safe to ignore for now.


And next you can test to see if it's working by visiting `http://[your VPS ip address]:8080/`. In your web browser, you should see something that looks like this
```
{"ipv4":{"mobile":0,"tablet":0,"desktop":0},"ipv6":{"mobile":0,"tablet":0,"desktop":0},"init":true}
```
and in your terminal you should see your web browsers IP address.

Make sure to press `CTRL+C` to exit the Node process after testing so you can move on.

This should confirm the project is fully functional, and you can move on to the next step.

### Installing PM2
[PM2](https://www.npmjs.com/package/pm2) is our process manager of choice, it's easy to set up and has lots of great features.

Install PM2 globally by typing
```
npm i -g pm2
```

To initialize PM2's startup scripts, you'll need to run the following command.
```
pm2 startup
```

Next, we'll start up the process in pm2 by typing
```
pm2 start app.js
```

You should be able to monitor the application by typing `pm2 logs 0`, which is a great feature for debugging.

Finally, to make sure the script restarts with the VPS if an unexpected shutdown occurs, type
```
pm2 save
```

## Configure your DNS

Now you'll need to set up two subdomains pointing at your VPS across three records. For the rest of this project, substitute `your-domain.com` with whatever domain you use for this step.

We'll need two subdomains, one with only an IPv6 address on it so that browsers will be forced to attempt over IPv6 networking, and one with both an IPv6 and an IPv4 address as a fallback if the users networking doesn't support IPv6.

---

First, create an `AAAA` record with the name of `ipv6-only` and point it to the IPv6 address of your VPS.

Then Create an `A` record, and an `AAAA` record with the name of `ipv6`, and point it to the IPv4 and IPv6 address of your VPS respectively.

If your DNS service doesn't support `A` or `AAAA` records you can try using CloudFlare as your DNS, after you finish adding the records, your DNS should look something like this:

<kbd>
    <img src="assets/images/cloudflare-dns.PNG?raw=true" width="500">
    
</kbd>

If you're using CloudFlare or a similar service, make sure you aren't proxying requests to your VPS as you'll only record CloudFlares IP addresses in that case. 


## Nginx

First, install Nginx using the following command.

```
apt install nginx
```

Once it's done we'll need to set up the custom NGINX configuration file. Start by typing `nano` in your console.

Next, you'll need to paste in our configuration file. Make sure to replace `your-domain.com` with the domain you're pointing at your DNS.

```conf
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
```

Press `CTRL+O` to write out the file, and for the destination type `/etc/nginx/sites-enabled/default` and hit enter. It will ask you if you want to overwrite the file in that location, and since we want to overwrite the default configuration press `Y` for yes.

Confirm your config file is formatted correctly

```
nginx -t
```

If everything looks good, restart NGINX to load in the new configuration file

```
systemctl restart nginx
```

Nginx should now be reverse proxying traffic from your specified domains to the Node process.

### SSL
These steps are pulled from [this guide created by DigitalOcean](https://www.digitalocean.com/community/tutorials/how-to-secure-nginx-with-let-s-encrypt-on-ubuntu-18-04) for version 18.04 of Ubuntu.

Since most modern sites are on SSL encryption, we'll need to use certbot/letsencrypt to secure traffic to the VPS.

You'll need to add the certbot repository using the following command.
```
add-apt-repository ppa:certbot/certbot
```

Next, you'll be able to install certbot.
```
apt install python-certbot-nginx
```

Now that certbot is all set up, you can get your certificates by running it.
```
certbot --nginx -d ipv6.your-domain.com -d ipv6-only.your-domain.com
```

If certbot asks you if you want to redirect all SSL traffic, make sure to select `No Redirect` so it doesn't do anything unwanted to the Nginx config file.

## Enable UFW

Now that you have everything set up and confirmed that it's working, it's a good idea to enable the firewall and block any ports we're not using for this project.

You'll be using port 22 for SSH, and 80 + 443 for web traffic, so add these to the firewall
```
ufw allow 22
```
```
ufw allow 80
```
```
ufw allow 443
```

Now that the ports are added, enable the Universal Fire Wall
```
ufw enable
```

All ports except for the specified 22, 80, and 443 are now blocked. However it's still a good idea to [secure your VPS further](https://www.digitalocean.com/community/tutorials/an-introduction-to-securing-your-linux-vps).

## Include analytics script in your website

Include the following script in your website's footer. And make sure to replace `your-domain.com` with the appropriate domain.
```html
<script>
/*
  Script to track ipv6 usage vs ipv4
*/
window.addEventListener('DOMContentLoaded', function () {
  try {
    const ipv6FillInIp = (ip) => {
      // Fills in the IP address if an element has the class name 'analytics-whats-my-ip'
      const elements = document.body.querySelectorAll('.analytics-whats-my-ip');
      const elements2 = document.body.querySelectorAll('.analytics-whats-my-ip__container');
      for (let index = 0; index < elements.length; index++) {
        const element = elements[index];
        element.textContent = ip;
      }
      for (let index = 0; index < elements2.length; index++) {
        const element = elements2[index];
        element.classList.add('analytics-whats-my-ip--active');
        if (ip.indexOf(':') > 0) {
          element.classList.add('analytics-whats-my-ip--ipv6');
        }
      }
    }
    fetch('//ipv6-only.your-domain.com/?screen='+window.innerWidth)
      .then(
        function(response) {
          if (response.status !== 200) {
            return;
          }
          // Examine the text in the response
          response.json().then(function(data) {
            ipv6FillInIp(data.yourIp);
            if (typeof ga === 'function' && !localStorage['6connect: '+data.yourIp]) {
              localStorage['6connect: '+data.yourIp] = true;
              ga('send', 'event', 'IPVersion', 'ipv6', 'ipv6', {'nonInteraction': 1});
            }
          });
        }
    )
    .catch(function(err) {
      // IPv6 fetch failed
      try {
        fetch('//ipv6.your-domain.com/?screen='+window.innerWidth)
          .then(
            function(response) {
              if (response.status !== 200) {
                return;
              }
              response.json().then(function(data) {
                ipv6FillInIp(data.yourIp);
                if (typeof ga === 'function' && !localStorage['6connect: '+data.yourIp]) {
                  localStorage['6connect: '+data.yourIp] = true;
                  ga('send', 'event', 'IPVersion', 'ipv4', 'ipv4', {'nonInteraction': 1});
                }
              });
            }
        )
        .catch(function(err) {
          // IPv4 fetch failed
        });

      } catch (e) {
        // Fetch will fail silently on older browsers
      }
    });
  } catch (e) {
    //fail silently on older browsers
  }
});

</script>
```

There are a couple of additional features in this script.

>If you have any DOM elements with the class name `analytics-whats-my-ip` they will be filled in with the site visitors IP address, which could be IPv6 or IPv4. Additionally, elements with the class name `analytics-whats-my-ip__container` will receive the class name `analytics-whats-my-ip--active`. And if the users IP address is IPv6 then the container element will also receive the class name of `analytics-whats-my-ip--ipv6` if you wish to have additional styling such as reducing the font size.

If your site has universal analytics installed, the script will attempt to send a non-interactive event (won't affect bounce rate) to google analytics so that you can compare additional statistics.

## GUI with WebSockets

You can view the results in plain text by visiting `ipv6.your-domain.com` in your browser, however, if you would like to use the simple visualization tool we put together you can follow these steps.

Make the web root directory for the files
```
mkdir -p /var/www/6connect
```

Move to the directory
```
cd /var/www/6connect
```

Clone our GUI repository
```
git clone https://github.com/6connect/ipv6-website-stats-gui
```

Now you should be able to visit `ipv6.your-domain.com/gui` and view the results live.

(if you see the raw JSON output, something went wrong, make sure you're in the right directory and your files are in the right place, repeat this step.)
