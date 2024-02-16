let $ = document.querySelector.bind(document);

$('#ipfs-gateways').onchange = function(){

    chrome.storage.sync.set({'ipfs_gateway': $('#ipfs-gateways').value}, function(){

        //console.log('sats',$('#ipfs-gateways').value);
        //close();
    });
}

chrome.storage.sync.get(['ipfs_gateway'], function(result) {

    console.log(result);

    $('#ipfs-gateways').value = result.ipfs_gateway;
});