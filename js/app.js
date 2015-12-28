/* jshint esnext:true */
var auid = "username";
var fbURL = "https://canned-replies.firebaseio.com/";
var repliesFB = new Firebase(fbURL + auid + "/replies");

// State
var replies = [];
var sortField = '';
var filterText = '';


/*
 *  Update Sort
 */

var setSort = function(val) {
  var name = $('[data-val=' + val + ']').text();
  console.log(`Sorting by ${name} (${val})`);
  $('#current-sort').html(name); // Update Dropdown menu
  sortField = val;
  renderReplies();
};

$('.dropdown-menu').on('click', 'a', function(e) {
  var newSort = $(this).data('val');
  setSort(newSort);
});



/*
 * Update Filter
 */

$('#filter').on('input', function(e) {
  filterText = e.target.value;
  if(window.requestAnimationFrame) {
    window.requestAnimationFrame(renderReplies);
  } else {
    renderReplies();
  }
});



/*
 * Render
 */

var renderReplies = function() {
  // No replies, come up with empty/first-run state
  if(!replies.length) {
    $('#replies').html('You don\'nt have any replies set up yet. Create one to get started.');
    return;
  }
  
  // array of replies => filter => sort => array of html strings => joined
  var domString = replies
  .filter(reply => {
    var needle = safeHtml(filterText).trim().toLowerCase();
    var haystack = reply.name.toLowerCase() + reply.message.toLowerCase();
    return haystack.indexOf(needle) >= 0;
  })
  .sort((a, b) => {
    // Always returns in descending order
    if (a[sortField] > b[sortField]) return -1;
    else if (a[sortField] < b[sortField]) return 1;
    else return 0;
  })
  .map(reply => {
    return `
      <div class="reply" id="${reply.id}">
        <h1 class="reply-name">${reply.name}</h1>
        <p class="reply-message">${reply.message}</p>
        <a href="#" class="reply-delete" data-reply="${reply.id}"><i class="icon-remove"></i> Delete</a>
      </div>
    `;
  })
  .join('');
  
  $('#replies').html(domString);
};



/*
 * Fetch
 */

var fetchReplies = function () {
  repliesFB.on('value',
    fbReplies => {
      parseReplies(fbReplies);
      renderReplies();
    },
    err => console.log(err)
  );
};

var parseReplies = function(fbReplies) {
  // Firebase replies object => real array of replies; forEach is the only array iteration available
  var parsedReplies = [];
  fbReplies.forEach( reply => {
    var newReply = reply.val();
    newReply.id = reply.key();
    [newReply.name, newReply.message] = [newReply.name, newReply.message].map(safeHtml);
    parsedReplies.push(newReply);
  });
  
  replies = parsedReplies;
};

var escapeChars = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': '&quot;',
  "'": '&#39;',
  "/": '&#x2F;'
};
function safeHtml(string) {
  return String(string).replace(/[&<>"'\/]/g, function (s) {
    return escapeChars[s];
  });
}



/*
 * Create
 */

$('#create-reply').on('submit', function(e) {
  e.preventDefault();
  
  var newReply = $(this).serializeArray().reduce(function(newReply, field){
    if(!newReply.hasOwnProperty(field.name)) {
      newReply[field.name] = field.value;
    }
    return newReply;
  }, {});
  
  newReply.useCount = 0;
  newReply.created = new Date().getTime();
  
  repliesFB.push(newReply, err => {if (err) console.log(err);});
  
  // Hide the form
  $(this).trigger("reset"); // Clear the form
});



/*
 * Delete
 */
 
$('#replies').on('click', '.reply-delete', function() {
  var id = $(this).data('reply');
  if(confirm("Are you sure?")) {
    repliesFB.child(id).remove();
  }
});



/*
 * Boot App
 */

setSort(/*get cookie ||*/ 'useCount');
fetchReplies();


// var card = new SW.Card();
// card.services('environment').request('environment').then(
//   function(environment){
//     // environment.app_host.auid;
//   }).catch(
//     function(error) {
//       console.error(error);
//     }
//   );

// repliesFB.authWithCustomToken(token, function(error, authData) {
//   if (error) {
//     console.log("Login Failed!", error);
//   } else {
//     console.log("Login Succeeded!", authData);
//   }
// });

