let busy = {};

chrome.webRequest.onErrorOccurred.addListener(resolverListener, {
    urls: [
        "*://*.sats/*"
    ],
    types: [
        "main_frame"
    ],
});

async function resolverListener(details){

    let splitted = details.url.split('://');
    let path = splitted[1].split('/');
    let domain = path[0];

    if(typeof busy[domain] != 'undefined')
    {
        return;
    }

    busy[domain] = true;

    try
    {

        let ipfs_gateway = 'https://ipfs.io/ipfs/';
        let result = await chrome.storage.sync.get('ipfs_gateway');

        if(typeof result.ipfs_gateway != 'undefined')
        {
            ipfs_gateway = result.ipfs_gateway;
        }

        console.log('gateway', ipfs_gateway);

        chrome.tabs.update(details.tabId, { url: 'loading.html?domain='+domain});

        let domain_info = await getDomainData(domain);
        let resolvers = await getResolvers('{"p":"sns","op":"res","name":"'+domain+'"');
        resolvers.results.reverse();

        console.log("RESOLVERS", resolvers);
        console.log("DOMAIN INFO", domain_info);

        for(let i = 0; i < resolvers.results.length; i++)
        {

            let content = JSON.parse(resolvers.results[i].contentstr);
            let resolver_data = await getInscriptionData(resolvers.results[i].inscriptionid);
            let domain_data = await getInscriptionData(domain_info.inscriptionId);
            let resolver_tx = await getTransaction(resolver_data.location.split(':')[0]);
            let domain_tx = await getTransaction(domain_data.location.split(':')[0]);

            console.log("RESOLVER DATA", resolver_data);
            console.log("DOMAIN DATA", domain_data);
            console.log("RESOLVER TX", resolver_tx);
            console.log("DOMAIN TX", domain_tx);

            // the actual domain must be sent to the same address AFTER the resolver has been sent
            // this "encodes" that the owner of both intended to enable the domain.
            if(domain_tx.status.confirmed &&
                resolver_tx.status.confirmed &&
                resolver_data.address.toLowerCase() ==
                    domain_data.address.toLowerCase() &&
                domain_tx.status.block_height >
                    resolver_tx.status.block_height)
            {

                let url;
                let content_uri = content.content.rtrim('/');

                if(content_uri.toLowerCase().startsWith('ipfs://'))
                {
                    let splitted_uri = content_uri.split('//');
                    let hash = splitted_uri[1];
                    path = path.slice(1);
                    url = ipfs_gateway + hash + '/' + path.join('/');
                }
                else if(content_uri.toLowerCase().startsWith('https://') || content_uri.toLowerCase().startsWith('http://'))
                {
                    path = path.slice(1);
                    url = content_uri + '/' + path.join('/');
                }
                else
                {
                    url = content_uri;
                }

                if(content_uri.toLowerCase().startsWith('ipfs://'))
                {
                    const response = await fetchWithTimeout(url, {
                        method: 'HEAD',
                    });

                    if (response.status !== 200) {

                        chrome.tabs.update(details.tabId, {url: 'error.html?error=504'});
                        delete busy[domain];
                        return;
                    }
                }

                chrome.tabs.update(details.tabId, { url });
                delete busy[domain];
                return;
            }
        }

        chrome.tabs.update(details.tabId, { url: 'error.html?error=404'});
    }
    catch(e)
    {
        chrome.tabs.update(details.tabId, { url: 'error.html?error=500'});
        console.log(e);
    }

    delete busy[domain];
}

String.prototype.rtrim = function(s) {
    return this.replace(new RegExp(s + "*$"),'');
};

async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 30000 } = options;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(resource, {
        ...options,
        signal: controller.signal
    });
    clearTimeout(id);

    return response;
}

async function getTransaction(tx)
{
    try
    {
        const response = await fetch('https://mempool.space/api/tx/'+tx);
        const resJson = await response.json();
        return resJson;
    }
    catch(e) {

        console.log(e);
    }

    return {error: true};
}

async function getResolvers(inscription_content){

    try
    {
        const response = await fetch('https://api2.ordinalsbot.com/search?text='+encodeURIComponent(inscription_content));
        const resJson = await response.json();
        return resJson;
    }
    catch(e) {

        console.log(e);
    }

    return {error: true};
}

async function getDomainData(domain) {

    try
    {
        const response = await fetch('https://api.sats.id/names/'+encodeURIComponent(domain));
        const resJson = await response.json();
        return resJson;
    }
    catch(e) {

        console.log(e);
    }

    return {error: true};
}

async function getInscriptionData(inscription_id) {

    try
    {
        let myHeaders = new Headers();
        myHeaders.append('cache-control', 'max-age=0');
        const response = await fetch('https://ordapi.xyz/inscription/'+encodeURIComponent(inscription_id),
            {
                headers: myHeaders
            });
        const resJson = await response.json();
        return resJson;
    }
    catch(e) {

        console.log(e);
    }

    return {error: true};
}