/* jshint esnext:true */
var fb;
var fbConnected = false;
var ticket;
var replies = [];
// State
var sortField = '';
var filterText = '';

var strings = {
  replySent: "Reply sent.",
  replyDeleted: "Reply deleted.",
  replySaved: "Reply saved.",
  replyEmpty: "This looks empty. Add a reply.",
  replyFailed: "Couldn't send reply. Reload the page and try again.",
  saveFailed: "Couldn't save reply. Reload the page and try again.",
  loginFailed: "Couldn't authenticate with your Spiceworks Desktop. Reload the page and try again.",
};


/*
 *  Update Sort
 */

var setSort = function(val) {
  var name = $('[data-val=' + val + ']').text();
  $('#current-sort').html(name); // Update Dropdown menu
  sortField = val;
  if(fbConnected){
    renderReplies();
  }
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
  
  if(!replies.length) {
    // No replies, come up with empty/first-run state
    $('#replies').html('You don\'nt have any replies. Create one now.');
    return;
  }

  var filteredReplies = replies.filter(reply => {
    var term = safeHtml(filterText).trim().toLowerCase();
    return reply.message.toLowerCase().indexOf(term) >= 0;
  });
  
  if(!filteredReplies.length) {
    console.log('None to show, ease up that filter!', filteredReplies.length, replies.length);
    // Replies are filtered out, come up with a message for this
    $('#replies').html('You\'ve filtered out your replies. Clear your filter.');
    return;   
  }
  
  var domString = filteredReplies.sort((a, b) => {
    // Always returns in descending order
    if (a[sortField] > b[sortField]) return -1;
    else if (a[sortField] < b[sortField]) return 1;
    else return 0;
  })
  .map(reply => {
    return `
      <div class='reply' id='${reply.id}'>
        <div class='reply-view'>
          <div class="controls-left">
            <button class='btn-link reply-edit' data-reply='${reply.id}'>
              <svg class="icon-pencil"><use xlink:href="#icon-pencil"></use></svg> Edit
            </button>
          </div>
          <div class="reply-body">
            <p class='reply-message'>${reply.message}</p>
          </div>
          <div class='controls-right'>
            <button class='btn reply-send' data-reply='${reply.id}'>
              <svg class="icon-check"><use xlink:href="#icon-check"></use></svg> Send
            </button>
          </div>
        </div>
        <form class='reply-form' data-reply='${reply.id}'>
          <div class="controls-left">
            <input type="submit" value="Save" class="btn-primary reply-edit-save">
            <button class="btn-link reply-edit-cancel">Cancel</button>
          </div>
          <div class="reply-body">
            <textarea name="message" rows="1">${reply.message}</textarea>
          </div>
          <div class="controls-right">
            <button class='btn-warn btn-link reply-delete' data-reply='${reply.id}'>
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

var login = function(token, cb) {
  fb.authWithCustomToken(token, (err) => {
    if (err) {
      fbConnected = false;
      growl(strings.loginFailed, 'error', err);
    } else {
      if (cb) cb();
    }
  });
};

var fetch = function () {
  fb.on('value',
    fbReplies => {
      fbConnected = true;
      parse(fbReplies);
      renderReplies();
    },
    err => {
      fbConnected = false;
      growl(strings.loginFailed, 'error', err);
    }
  );
};

var parse = function(fbReplies) {
  // Firebase replies object => real array of replies; forEach is the only array iteration available
  var parsedReplies = [];
  fbReplies.forEach( reply => {
    var newReply = reply.val();
    newReply.id = reply.key();
    newReply.message = safeHtml(newReply.message);
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
  var $form = $(this);
  
  if( !$form.find('textarea').val().trim().length ){
    clearGrowls();
    growl(strings.replyEmpty, 'error');
    return;
  }
  
  $form.add(document.body).removeClass('is-editing');

  // Serialize the form into an object
  var newReply = serializeForm( $form );
  
  newReply.useCount = 0;
  newReply.created = new Date().getTime();
  
  fb.push(newReply, err => {
    if (err) {
      growl(strings.saveFailed, 'error', err);
    } else {
      growl(strings.replySaved);
    }
  });
  
  $form.trigger("reset"); // Clear the form
});



/*
 * Update
 */

// Show edit form
$('#replies').on('click', '.reply-edit', function() {
  var $reply = $(this).closest('.reply');
  $reply.add(document.body).addClass('is-editing');
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
  var $form = $(this);
  
  if( !$form.find('textarea').val().trim().length ){
    clearGrowls();
    growl(strings.replyEmpty, 'error');
    return;
  }

  var id = $(this).data('reply');
  var updatedReply = serializeForm( $form );
  $(document.body).removeClass('is-editing');
  fb.child(id).update(updatedReply, err => {
    if (err) {
      growl(strings.saveFailed, 'error', err);
    } else {
      growl(strings.replySaved);
    }
  });
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
  fb.child(id).remove();
  growl(strings.replyDeleted);
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
    fb.child(id).update({
      lastUsed: new Date().getTime(),
      useCount: reply.useCount++
    }, err => {
      if (err){ 
        growl(strings.saveFailed, 'error');
      } else {
        growl(strings.replySent);
      } 
    });
  }, err => growl(strings.replyFailed, 'error'));

});



/*
 * Growl Alerts
 */

// Show
var growl = function(msg, type='info', err=null) {
  var growlIcons = {
    info: '<span class="growl-symbol growl-symbol-success"><svg class="icon-check"><use xlink:href="#icon-check"></use></svg></span>',
    error: '<span class="growl-symbol growl-symbol-error"><svg class="icon-cross"><use xlink:href="#icon-cross"></use></svg></span>'
  };
  var growlTemplate = `
    <div class="growl">
      ${growlIcons[type]}
      ${msg}
      <button class="growl-close"><svg class="icon-cross"><use xlink:href="#icon-cross"></use></svg></button>
    </div><br>
  `;
  var $growl = $(growlTemplate).appendTo( $('.growl-wrapper') );
  window.setTimeout(function(){
    $growl.addClass('in');
  }, 0);

  if(type !== 'error') {
    window.setTimeout(function(){
      hideGrowl( $growl );
    }, 3000);
  }
  
  if (err) {
    console.error(err);
  }
};

// Hide
var hideGrowl = function($el) {
  $el.removeClass('in');
  $el.on('transitionend webkitTransitionEnd', function () {
    var $br = $el.next('br');
    $el.add($br).remove();
  });
};

$('.growl-wrapper').on('click', '.growl', function(){
  hideGrowl($(this));
});

// Clear
var clearGrowls = function() {
  $('.growl-wrapper .growl').each(function() {
    hideGrowl( $(this) );
  });
};


/*
 * Utilities
 */

var serializeForm = function($form) {
  return $form.serializeArray().reduce((obj, formField) => {
    obj[formField.name] = formField.value;
    return obj;
  }, {});
};

var safeHtml = function(string) {
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
};

// Bind cmd-enter to submit forms
document.body.addEventListener('keydown', function(e) {
	if(!(e.keyCode == 13 && e.metaKey)) return;

	var target = e.target;
	if(target.form) {
		$(target.form).submit();
	}
});

var inIframe = function() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
};


/*
 * Boot App
 */

var setupEnv = function(auid){
  fb = new Firebase('https://canned-replies.firebaseio.com/' + auid + '/replies');
  var auth = fb.getAuth() ? fetch() : login(token, fetch);
  fb.onAuth(function(){
    setSort(/*get cookie ||*/ 'useCount');
  });
};

if ( inIframe() ) {
  var card = new SW.Card();

  card.services('helpdesk').on('showTicket', id => {
    ticket = id;
    $(document.body).removeClass( 'no-ticket' );
  });

  card.onActivate(environment => {
    setupEnv(environment.app_host.auid);
  });  
} else {
  setupEnv('username');
}