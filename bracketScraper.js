  async function scrapeData(authorization, phaseId, callback) {
    // Player data stored here
    var playerData = {};
    // Grabs data from brackets
    console.log("Accessing data...")
    let url = "https://braacket.com/league/NASB/ranking/27B7A8A4-25BE-4FDC-9690-CEC61E6AA078?rows=200&cols=&page=1&page_cols=1&country=&search="
    data = await axios.get(url);
    const parser = new DOMParser();
    const pageHTML = parser.parseFromString(data.data, "text/html")
    let maxPage = pageHTML.querySelectorAll(".input-group-addon")[6].innerHTML.replace("\n", "").replace("\t", "").replace("/", "").trim();
    let rank = 1
    for (let i = 1;i<=maxPage;i++){
        let pageNumber = i
        let url = "https://braacket.com/league/NASB/ranking/27B7A8A4-25BE-4FDC-9690-CEC61E6AA078?rows=200&cols=&page=" + pageNumber + "&page_cols=1&country=&search=";
        console.log("Gathering ranks from page " + i + "/" + maxPage)
        try {
            // Fetch HTML of the page we want to scrape
            data= await axios.get(url);
            // Load HTML we fetched in the previous line
            const nameHTML = parser.parseFromString(data.data, "text/html");
            let player = 1;
            try{
                for (let i = 5; i<205;i++){
                    // Name holds the player's name as a string
                    var name = nameHTML.querySelectorAll(".ellipsis")[i].querySelector("a").innerText;
                    name = name.split(" | ").pop()
                    name = name.split("] ").pop()
                    playerData[name] = rank
                    // Increment
                    player+=1;
                    rank+=1
                }
            } catch (err) {
                console.log(err);
            }
        } catch (err) {
            console.error(err);
        }
    }
    // Logic starts here
    console.log("Success!")
    callback(authorization, phaseId, playerData);
  }
  // Invoke the above function
  function Player(name, seedId, rank){
    this.name = name
    this.seedId = seedId
    this.rank = rank
  }
  function seedUpdate(authorization, phaseId, seedMapping) {
    const options = {
      method: 'POST',
      // Assign auth token and specific mutation details
      headers: { 'content-type': 'application/x-www-form-urlencoded',"Authorization": "Bearer " + authorization },
      data: {"query": "mutation UpdatePhaseSeeding ($phaseId: ID!, $seedMapping: [UpdatePhaseSeedInfo]!) {updatePhaseSeeding (phaseId: $phaseId, seedMapping: $seedMapping) {id}}",
        "variables":{
            "phaseId": phaseId,
            "seedMapping": seedMapping
        }
      },
      url: "https://api.smash.gg/gql/alpha",
    };
    // Send mutation request
    axios.request(options).then((response) => {
      console.log("Updating seeding...")
      if (response.data.errors != undefined) {
        console.log(response.data.errors)
      }
      else {
        console.log("pogChamp")
      }
    })
  }
function smashQuery(authorization, phaseId, playerData) {
  const options = {
    method: 'POST',
    // Assign auth token and specific query details
    headers: { 'content-type': 'application/x-www-form-urlencoded',"Authorization": "Bearer " + authorization},
    data: {"query": "query GetPhaseSeeds($phaseId: ID!) {phase(id: $phaseId) {seeds(query: { page: 1, perPage: 300 }) {nodes {id seedNum entrant {id participants {id gamerTag}}}}}}",
      "variables":{
          "phaseId": phaseId,
      }
    },
    url: "https://api.smash.gg/gql/alpha",
  };
  // Return player information
  axios.request(options).then((response) => {
    console.log("Organizing player data...")
    var playerArray = []
    var removedPlayers = []
    var seedMapping = []
    // Constructing objects out of player data and storing
    for (let i = 0; i < response.data.data.phase.seeds.nodes.length; i++){
      var playerName = response.data.data.phase.seeds.nodes[i].entrant.participants[0].gamerTag
      var seedId = response.data.data.phase.seeds.nodes[i].id
      var rank = playerData[playerName]
      var player = new Player(playerName, seedId, rank)
      playerArray.push(player)
    };
    // Removing and storing players with undefined rank
    console.log("Accounting for casuals...")
   // for (let i=0; i <= playerArray.length; i++){
    //  if (playerArray[i].rank === undefined ||playerArray[i].rank === null ){
     //   removedPlayers.push(playerArray.splice(i, 1)[0])
     // }
   // }
	  // console.log(removedPlayers);
	  
	removedPlayers = playerArray.filter((a) => a.rank === undefined);
	playerArray = playerArray.filter((a) => a.rank !== undefined);
    // Sorting playerArray by rank
    console.log("Seeding players...")
	
    playerArray.sort((a, b)=> {
    return a.rank - b.rank;
    })
   console.log(playerArray);

    // Adding removed players to playerArray
    for (let i = 0; i < removedPlayers.length; i++){
      playerArray.push(removedPlayers[i])
    }
    // Storing exclusively seedId and new seed
    for (let i = 0; i < playerArray.length; i++){
      seedMapping.push({
        "seedId": playerArray[i].seedId,
        "seedNum": i+1
      })
    }
   seedUpdate(authorization, phaseId, seedMapping)
   console.log(playerArray);
  })
}
document.addEventListener('DOMContentLoaded', function() {
  var button = document.getElementById('updateSeeding');
  // onClick's logic below:
  button.addEventListener('click', function() {
      onClick();
  });
});
function onClick() {
  var authorizationValue = document.getElementById("authorizationBox").value
  var phaseIdValue = document.getElementById("phaseIdBox").value
  chrome.storage.local.set({authorization: authorizationValue, phaseId: phaseIdValue}, function() {
    console.log('authorization is set to ' + authorizationValue);
    console.log('phaseId is set to ' + phaseIdValue);
  });
  // TODO: Re-enable scrape data once the fields are properly being set :)
  scrapeData(authorizationValue, phaseIdValue, smashQuery)
}

window.onload = function() {
  var authorizationText = document.getElementById("authorizationBox")
  var phaseIdText = document.getElementById("phaseIdBox")

  chrome.storage.local.get(["authorizationBox", "phaseIdBox"], function(result) {
    authorizationText.value = result.authorizationBox;
    console.log('Value currently is ' + result.authorizationBox);
    phaseIdText.value = result.phaseIdBox;
    console.log('Value currently is ' + result.phaseIdBox);
  });
  authorizationText.addEventListener('input', function(e) {
    chrome.storage.local.set({authorizationBox: e.target.value}, function() {
        console.log('authorization is set to ' +  e.target.value);
      });
    });
  phaseIdText.addEventListener('input', function(e) {
      chrome.storage.local.set({phaseIdBox: e.target.value}, function() {
          console.log('phaseId is set to ' +  e.target.value);
      });
  });
}