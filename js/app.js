/* jshint esnext:true */
var model;
var token;
var ticket;
// State
var replies = [];
var sortField = '';
var filterText = '';


/*
 *  Update Sort
 */

var setSort = function(val) {
  var name = $('[data-val=' + val + ']').text();
  $('#current-sort').html(name); // Update Dropdown menu
  sortField = val;
  renderReplies();
};

$('.dropdown-menu').on('click', 'button', function() {
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
  // Abort render if a reply is being edited
  if( $(document.body).hasClass('is-editing') ){
    return;
  }
  
  // No replies, come up with empty/first-run state
  if(!replies.length) {
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
      <div class='reply-container' id='${reply.id}'>
        <div class='reply'>
          <h2 class='reply-name'>${reply.name}</h2>
          <p class='reply-message'>${reply.message}</p>
          <div class='reply-controls'>
            <button class='btn reply-send' data-reply='${reply.id}'>
              <svg class="icon-check"><use xlink:href="#icon-check"></use></svg> Send
            </button>
            <button class='btn-link reply-edit pull-right' data-reply='${reply.id}'>
              <svg class="icon-pencil"><use xlink:href="#icon-pencil"></use></svg> Edit
            </button>
          </div>
        </div>
        <form class='reply-form' data-reply='${reply.id}'>
          <input name="name" type="text" placeholder="Name (optional)" value='${reply.name}'>
          <textarea name="message" rows="1" placeholder="Reply">${reply.message}</textarea>
          <div class='form-controls'>
            <input type="submit" value="Save" class="btn-primary reply-edit-save">
            <button class="btn-link reply-edit-cancel">Cancel</button>
            <button class='btn-warn btn-link reply-delete pull-right' data-reply='${reply.id}'>
              <svg class="icon-cross"><use xlink:href="#icon-cross"></use></svg> Delete
            </button>
          </div>
        </form>
      </div>
    `;
  })
  .join('');
  
  $('#replies').html(domString);
};



/*
 * Fetch
 */

var login = function(cb) {
  model.authWithCustomToken(token, (err) => {
    if (err) {
      console.error("Login Failed!", err);
    } else {
      if (cb) cb();
    }
  });
};

var fetch = function () {
  model.on('value',
    fbReplies => {
      parse(fbReplies);
      renderReplies();
    },
    err => console.error(err)
  );
};

var parse = function(fbReplies) {
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



/*
 * Create
 */

 // Show Form
$('.create-form-toggle').on('click', function() {
  var $form = $('#create-form');
  $form.add(document.body).addClass('is-editing');
  autosize(document.querySelectorAll('textarea'));
});

// Cancel
$('.reply-create-cancel').on('click', function(e) {
  e.preventDefault();
  var $form = $('#create-form');
  $form.add(document.body).removeClass('is-editing');
  $form.trigger("reset");
  renderReplies();
 });

// Save
$('#create-form').on('submit', function(e) {
  e.preventDefault();
  
  $(this).add(document.body).removeClass('is-editing');

  // Serialize the form into an object
  var newReply = serializeForm($(this));
  
  newReply.useCount = 0;
  newReply.created = new Date().getTime();
  
  model.push(newReply, err => {if (err) console.error(err);});
  
  $(this).trigger("reset"); // Clear the form
});



/*
 * Update
 */

// Show edit form
$('#replies').on('click', '.reply-edit', function() {
  var $container = $(this).closest('.reply-container');
  $container.add(document.body).addClass('is-editing');
  autosize(document.querySelectorAll('textarea'));
});

// Cancel edits
$('#replies').on('click', '.reply-edit-cancel', function(e) {
  e.preventDefault();
  $(document.body).removeClass('is-editing');
  renderReplies();
});

// Save edits
$('#replies').on('submit', '.reply-form', function(e) {
  e.preventDefault();
  var id = $(this).data('reply');
  var updatedReply = serializeForm($(this));
  $(document.body).removeClass('is-editing');
  model.child(id).update(updatedReply, err => {if (err) console.error(err);});
  renderReplies();
});


/*
 * Delete
 */
 
$('#replies').on('click', '.reply-delete', function(e) {
  e.preventDefault();
  var id = $(this).data('reply');
  var $btn = $(this);

  if( $btn.hasClass('btn-link') ) {
    $btn.removeClass('btn-link');
    return;
  }
  
  $(document.body).removeClass('is-editing');
  model.child(id).remove();
});



/*
 * Send
 */
 
$('#replies').on('click', '.reply-send', function() {
  var $btn = $(this);
  var id = $btn.data('reply');
  var reply = replies.find(reply => reply.id === id);

  if( !$btn.hasClass('btn-primary') ) {
    $btn.addClass('btn-primary');
    return;
  }

  card.services('helpdesk').request('comment:create', ticket, { body: reply.message }).then(function() {
    // Increment useCount, Update lastUsed
    model.child(id).update({
      lastUsed: new Date().getTime(),
      useCount: reply.useCount++
    }, err => {
      if (err){ 
        console.error('Couldn\'t save reply data', err);
      } else {
        // Show success, send browser back to activity tab?
      } 
    });
  }, err => console.error('Couldn\'t send reply', err));

});



/*
 * Utilities
 */

var serializeForm = function($form) {
  return $form.serializeArray().reduce((obj, formField) => {
    obj[formField.name] = formField.value;
    return obj;
  }, {});
};

function safeHtml(string) {
  var escapeChars = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;',
    "/": '&#x2F;'
  };
  return String(string).replace(/[&<>"'\/]/g, function (s) {
    return escapeChars[s];
  });
}



/*
 * Boot App
 */

var card = new SW.Card();

card.services('helpdesk').on('showTicket', id => {
  ticket = id;
  $(document.body).addClass( 'ticket' );
});

card.onActivate(environment => {
  var auid = environment.app_host.auid;
  model = new Firebase('https://canned-replies.firebaseio.com/' + auid + '/replies');

  setSort(/*get cookie ||*/ 'useCount');

  var auth = model.getAuth() ? fetch() : login(fetch);

});
