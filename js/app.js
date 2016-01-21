/* jshint esnext:true */
var fb;
var ticket;
var replies = [];
var state = {
  sortField: '',
  filterText: ''
};

var strings = {
  replySent: "Reply sent.",
  replyDeleted: "Reply deleted.",
  replySaved: "Reply saved.",
  replyEmpty: "This looks empty. Add a reply.",
  replyFailed: "Couldn't send reply. Reload the page and try again.",
  saveFailed: "Couldn't save reply. Reload the page and try again.",

  loginFailed: "Couldn't connect to your&nbsp;account.<br>Reload&nbsp;the page and try&nbsp;again.",
  noReplies: "You don't have any&nbsp;replies&nbsp;yet.",
  repliesFiltered: "Your replies are exluded by&nbsp;your&nbsp;filter."
};


/*
 *  Update Sort
 */

var setSort = function(val) {
  var name = $('[data-val=' + val + ']').text();
  $('#current-sort').html(name); // Update Dropdown menu
  state.sortField = val;
  if(fb.connected){
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
  state.filterText = e.target.value;
  if(window.requestAnimationFrame) {
    window.requestAnimationFrame(renderReplies);
  } else {
    renderReplies();
  }
});

// Clear Filter
var clearFilter = function(e){
  $('#filter').val('').trigger('input'); // trigger input to fire a rerender
};

// Empty message Clear Filter button
$(document).on('click', '.filter-clear', clearFilter);

// Escape clears filter
$('#filter').on('keydown', function(e) {
  if (e.keyCode == 27) {
    clearFilter();
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

  var filteredReplies = replies.filter(reply => {
    var term = safeHtml(state.filterText).trim().toLowerCase();
    return reply.message.toLowerCase().indexOf(term) >= 0;
  });

  var repliesDom = filteredReplies.sort((a, b) => {
    // Always returns in descending order
    if (a[state.sortField] > b[state.sortField]) return -1;
    else if (a[state.sortField] < b[state.sortField]) return 1;
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
            <button class='btn-link reply-send' data-reply='${reply.id}'>
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
  
  if(!replies.length) {
    // No replies, come up with empty/first-run state
    $('#replies').html(`
      <div class='empty-message'>
        <p>${strings.noReplies}</p>
        <button class='btn-primary create-form-toggle'>
          <svg class="icon-plus"><use xlink:href="#icon-plus"></use></svg> New Reply
        </button>
      </div>
    `);
  } else if(!filteredReplies.length) {
    // Replies are filtered out, come up with a message for this
    $('#replies').html(`
      <div class='empty-message'>
        <p>${strings.repliesFiltered}</p>
        <button class='btn filter-clear'>Clear Filter</button>
      </div>`);
  } else {
    $('#replies').html(repliesDom);    
  }
};



/*
 * Fetch
 */

var login = function(token, cb) {
  fb.authWithCustomToken(token, (err) => {
    if (err) {
      fb.connected = false;
      $('#replies').html(`<div class='empty-message'>
        <p>${strings.loginFailed}</p>
      </div>`);
    } else {
      if (cb) cb();
    }
  });
};

var fetch = function () {
  fb.on('value',
    fbReplies => {
      fb.connected = true;
      parse(fbReplies);
      renderReplies();
    },
    err => {
      fb.connected = false;
      $('#replies').html(`<div class='empty-message'>
        <p>${strings.loginFailed}</p>
      </div>`);
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
$(document).on('click', '.create-form-toggle', function() {
  var $form = $('#create-form');
  $form.add(document.body).addClass('is-editing');
  autosize($form.find('textarea')).focus();
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
      clearGrowls();
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
  autosize($reply.find('textarea')).focus();
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
      clearGrowls();
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
    $btn.removeClass('btn-link').addClass('btn-primary');
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

// Keyboard shortcuts for forms
$(document.body).on('keydown', function(e) {
  var target;
	if((e.keyCode == 13 && (e.metaKey || e.ctrlKey))){  
    // cmd-enter to submit forms
  	target = e.target;
  	if(target.form) {
  		$(target.form).submit();
  	}
  } else if (e.keyCode == 27) {
    // esc to cancel out of forms
    target = e.target;
    if(target.form) {
      $(target.form).find('[class*="-cancel"]').click();
    }
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
  setSort(/*get cookie ||*/ 'useCount');
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