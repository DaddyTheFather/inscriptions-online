let $ = document.querySelector.bind(document);
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const domain = urlParams.get('domain');
const error = urlParams.get('error');

if(domain !== null)
{

    $('#loading').innerHTML += ' ' + domain;
    console.log(domain);
}

if(error !== null)
{
    let error_msg = '';

    switch(error)
    {

        case '404':
            error_msg += ' - domain not found';
            break;
        case '504':
            error_msg += ' - timeout';
            break;
        default:
            error_msg += ' - error loading the domain';
    }

    $('#loading').innerHTML += ' ' + error + error_msg;
    console.log(error);
}