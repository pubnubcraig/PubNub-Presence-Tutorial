UniqueID = PubNub.generateUUID()
console.log("CLIENT BROWSER UUID: ", UniqueID)
document.write("Your Client's UUID is: ", UniqueID);
var playerList = [];

pubnub = new PubNub({
  publishKey: 'pub-c-ef8d5984-2d73-4b41-9d89-9e5fec6cceaf',
  subscribeKey: 'sub-c-c4db67b2-7bb8-11e7-a289-0619f8945a4f',
  uuid: UniqueID,
});

// Subscribe to the two PubNub Channels
pubnub.subscribe({
  channels: ['playerlobby'],
  withPresence: true,
});

listener = {
  status(response) {
    if (response.category === "PNConnectedCategory") {
      // PNConnectedCategory confirmation that we have joined a channel
      // to see which channel(s) we just joined, call response.affectedChannels.
      // Now that we know we joined a channel(s), we need to find out
      // who else is already subscribed to this channel(s) before we joined
      hereNow(response.affectedChannels);
    }
  },
  message(response) {
  },
  presence(response) {
    //console.log(response)
    if (response.action === "join") {
      for(i=0; i < response.occupancy; i++){
        if(response.uuid !== undefined){
          var uuidMatchJoin = playerList.indexOf(response.uuid);
          console.log("UUID ARRAY INDEX: ", uuidMatchJoin, "UUID: ", response.uuid)
          if(uuidMatchJoin === -1){
            playerList[playerList.length] = response.uuid;
            console.log("Insert ", response.uuid, "in array" )
          } else {
            console.log("UUID: ", response.uuid, "is already in the array")
          }
        }
      }
    }

    if (response.action === "interval"){
      console.log("interval response: ", response)
      if(response.join !== undefined){
        for(i=0; i < response.occupancy; i++){
          if(response.join[i] !== undefined){
            var uuidMatchIntervalJoin = playerList.indexOf(response.join[i]);
            if(uuidMatchIntervalJoin === -1){
              console.log("Interval Add UUID: ", uuidMatchIntervalJoin);
              playerList[playerList.length] = response.join[i];
            }
          }
        }
      }

      if(response.leave !== undefined){
        for(i=0; i < response.occupancy; i++){
          var uuidMatchIntervalLeave = playerList.indexOf(response.leave[i]);
          if(uuidMatchIntervalLeave > -1){
            console.log("REMOVE PLAYER FROM ARRAY", uuidMatchIntervalLeave)
            playerList.splice(uuidMatchIntervalLeave, 1)
          }
        }
      }
    }

    if(response.action === "leave") {
      for(i=0; i < response.occupancy; i++){
        var uuidMatchLeave = playerList.indexOf(response.uuid);
        if(uuidMatchLeave > -1){
          console.log("REMOVE PLAYER FROM ARRAY", uuidMatchLeave, "with UUID: ", response.uuid)
          playerList.splice(uuidMatchLeave, 1)
        }
      }
    }
    console.log("Presence UUIDs:", playerList)
  },
}

function hereNow(channels) {
  // clearInterval(occupancyCounter)

  // you may have joined more than one channel so you would need to
  // iterate on channels and call hereNow for each one
  for (channel in channels) {
    var channel = channels[0];

    pubnub.hereNow(
    {
      channel: channel,
      includeUUIDs: true,
      includeState: true
    },
    function (status, response) {
      // keep in mind that due to the "eventual consistance" reality of
      // realtime distributed network computing, you may not see yourself
      // in this list of occupants returned by the hereNow call.
      // but we know we are subscribed and it is just a matter of
      // event consistency to catch up in a matter of milliseconds to possibly seconds
      console.log("hereNow Response: ", response);
      for(i=0; i < response.totalOccupancy; i++){
        playerList[i] = response.channels.playerlobby.occupants[i].uuid;
      }
      console.log("hereNow UUIDs: ", playerList)
      pubnub.addListener(listener);
    });
  } // for each
}

// occupancyCounter = setInterval(hereNow, 2000);

// If person leaves or refreshes the window, run the unsubscribe function
onbeforeunload = function() {
  globalUnsubscribe();

  $.ajax({
    // Query to server to unsub sync
    async:false,
    method: "GET",
    url: "https://pubsub.pubnub.com/v2/presence/sub-key/sub-c-c4db67b2-7bb8-11e7-a289-0619f8945a4f/channel/playerlobby/leave?uuid=" + encodeURIComponent(UniqueID)
  }).done(function(jqXHR, textStatus) {
    console.log( "Request done: " + textStatus );
  }).fail(function( jqXHR, textStatus ) {
    console.log( "Request failed: " + textStatus );
  });
  return null;
}

// Unsubscribe people from PubNub network
globalUnsubscribe = function () {
  try {
    pubnub.unsubscribe({
      channels: ['playerlobby']
    });
    pubnub.removeListener(listener);
  } catch (err) {
    console.log("Failed to UnSub");
  }
};
