/* jshint esnext:true */
var fb;
var ticket;
var state = {
  isEditing: false,
  fetchedReplies: [],
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
  offline: "Couldn't connect to your account. Are you connected to the internet?",
  online: "Connection re-established.",

  connecting: "Connecting...",
  loginFailed: "Couldn't connect to your&nbsp;account.<br>Reload&nbsp;the page and try&nbsp;again.",
  noReplies: "You don't have any&nbsp;replies&nbsp;yet.",
  repliesFiltered: "Your replies are excluded by&nbsp;your&nbsp;filter."
};


/*
 *  Update Sort
 */

var setSort = function(val) {
  var name = $('[data-val=' + val + ']').text();
  $('#current-sort').html(name); // Update Dropdown menu
  state.sortField = val; // update the gloabl state
  document.cookie = `sort=${val}`; // store in the cookie
  if(state.fbConnection !== undefined){
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
  if(state.fbConnection !== undefined){
    if(window.requestAnimationFrame) {
      window.requestAnimationFrame(renderReplies);
    } else {
      renderReplies();
    }
  }
});

// Clear Filter
var clearFilter = function(e){
  var $filter = $('#filter');
  if( $filter.val() ) $filter.val('').trigger('input'); // trigger input to fire a rerender 
};

// Empty message Clear Filter button
$(document).on('click', '.filter-clear', clearFilter);

// Escape clears filter
$('#filter').on('keydown', function(e) {
  if (e.which == 27) clearFilter();
});



/*
 * Render
 */

var renderReplies = function() {
  // Abort render if a reply is being edited
  if( state.isEditing ){
    return;
  }
  
  var selected = $('input[name="replies"]:checked').attr('id');
  var isSelected = id => selected === id ? 'checked' : '';

  var filteredReplies = state.fetchedReplies.filter(reply => {
    var term = safeHtml(state.filterText).trim().toLowerCase();
    if (!term) {
      delete(reply.highlightedMessage);
      return true;
    }
    if(reply.message.toLowerCase().indexOf(term) >= 0){
      var filterRegex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
      reply.highlightedMessage = reply.message.replace(filterRegex, "<span class='highlight'>$1</span>");
      return true;
    } else {
      return false;
    }
  });

  var repliesDom = filteredReplies.sort((a, b) => {
    // Always returns in descending order
    if (a[state.sortField] > b[state.sortField]) return -1;
    else if (a[state.sortField] < b[state.sortField]) return 1;
    else return 0;
  })
  .map((reply, index) => {
    return `
      <input type='radio' class='reply-select' name='replies' value='${index}' id='${reply.id}' ${ isSelected(reply.id) }>
      <label class='reply' id='${reply.id}' for='${reply.id}'>
        <div class='reply-view'>
          <div class="reply-body">
            <p class='reply-message'>${reply.highlightedMessage || reply.message}</p>
          </div>
          <div class="reply-controls">
            <button class='btn-primary reply-send' data-reply='${reply.id}' tabindex='-1'>
              <svg class="icon-check"><use xlink:href="#icon-check"></use></svg> Send
            </button>
            <button class='btn-link pull-right reply-edit' data-reply='${reply.id}' tabindex='-1'>
              <svg class="icon-pencil"><use xlink:href="#icon-pencil"></use></svg> Edit
            </button>
          </div>
        </div>
        <form class='reply-form' data-reply='${reply.id}'>
          <div class="reply-body">
            <textarea name="message" rows="1">${reply.message}</textarea>
          </div>
          <div class="reply-controls">
            <input type="submit" value="Save" class="btn-primary reply-edit-save">
            <button class="btn-link reply-edit-cancel">Cancel</button>
            <button class='btn-warn btn-link pull-right reply-delete' data-reply='${reply.id}'>
              <svg class="icon-cross"><use xlink:href="#icon-cross"></use></svg>
              <svg class="icon-check"><use xlink:href="#icon-check"></use></svg> Delete
            </button>
          </div>
        </form>
      </label>
    `;
  })
  .join('');
  
  if(!state.fetchedReplies.length) {
    // No replies
    emptyMessage(`
      <p>${strings.noReplies}</p>
      <button class='btn-primary create-form-toggle'>
        <svg class='icon-plus'><use xlink:href='#icon-plus'></use></svg> New Reply
      </button>
    `);
  } else if(!filteredReplies.length) {
    // Replies filtered
    emptyMessage(`
      <p>${strings.repliesFiltered}</p>
      <button class='btn filter-clear'>Clear Filter</button>
    `);
  } else $('#replies').html(repliesDom);
};



/*
 * Fetch
 */

var login = function(token, cb) {
  fb.authWithCustomToken(token, (err) => {
    if (err) {
      emptyMessage(`<p>${strings.loginFailed}</p>`);
    } else {
      if (cb) cb();
    }
  });
};

var fetch = function () {
  fb.on('value',
    fbReplies => {
      parse(fbReplies);
      renderReplies();
    },
    err => {
      emptyMessage(`<p>${strings.loginFailed}</p>`);
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
  
  state.fetchedReplies = parsedReplies;
};



/*
 * Create
 */

 // Show Form
$(document).on('click', '.create-form-toggle', function() {
  var $form = $('#create-form');
  $form.addClass('is-editing');
  $('.reply-select:checked').attr('checked', false);
  toggleEditMode(true);
  autosize($form.find('textarea')).focus();
});

// Cancel
$('.reply-create-cancel').on('click', function(e) {
  e.preventDefault();
  var $form = $('#create-form');
  $form.trigger("reset");
  autosize.update( $form.find('textarea'));
  $form.removeClass('is-editing');
  toggleEditMode(false);
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
  
  toggleEditMode(false);

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
  
  $form.trigger("reset");
  autosize.update( $form.find('textarea'));
  $form.removeClass('is-editing');
});



/*
 * Update
 */

// Show edit form
$('#replies').on('click', '.reply-edit', function() {
  var $reply = $(this).closest('.reply');
  $reply.addClass('is-editing');
  toggleEditMode(true);
  autosize($reply.find('textarea')).focus();
});

// Cancel edits
$('#replies').on('click', '.reply-edit-cancel', function(e) {
  e.preventDefault();
  toggleEditMode(false);
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
  toggleEditMode(false);
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

  if( !$btn.hasClass('reply-delete-confirm') ) {
    $btn.addClass('reply-delete-confirm');
    return;
  }
  
  toggleEditMode(false);
  fb.child(id).remove();
  growl(strings.replyDeleted);
});



/*
 * Send
 */
 
$('#replies').on('click', '.reply-send', function() {
  var $btn = $(this);

  if( !$btn.hasClass('reply-send-confirm') ) {
    $btn.addClass('reply-send-confirm');
    return;
  }

  var id = $btn.data('reply');
  var reply = state.fetchedReplies.find(reply => reply.id === id);

  card.services('helpdesk').request('comment:create', ticket, { body: reply.message }).then(function() {
    // Increment useCount, Update lastUsed
    fb.child(id).update({
      lastUsed: new Date().getTime(),
      useCount: ++reply.useCount
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
 * Selection
 */

// Send
$('#replies').on('keydown', '.reply-select', function(e){
  if(e.which === 13) replyClickSend();
});

var replyClickSend = function() {
  $('.reply-select:checked').next('.reply').find('.reply-send').trigger('click');
};

// Drop focus into the replies list on up, down, enter
$('#filter').on('keydown', function(e) {
  if ( e.which === 38 || e.which === 40 || e.which === 13 ) {
    e.preventDefault();
    if( e.which === 38 ) { // up
      $('.reply-select').last().focus().prop('checked', true);
    } else if( e.which === 40 || e.which === 13) { // down + enter
      $('.reply-select').first().focus().prop('checked', true);
    }
  }
});

// Select first reply on focus
$('#replies').on('focus', '.reply-select', function(){
  if( !$('.reply-select:checked').length ) {
    $(this).first().prop('checked', true);
  }
});

// Reset confirmed send button on change
$('#replies').on('change', '.reply-select', function(){
  $('.reply-send-confirm').removeClass('reply-send-confirm');
});



/*
 * Toggle Edit Mode
 */
var toggleEditMode = function(bool) {
  state.isEditing = bool;
  $('header input, header button').attr('disabled', bool);
  $('.reply-select:not(:checked)').attr('disabled', bool);
};



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

var escapeRegExp = str => str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");

// Keyboard shortcuts for forms
$(document.body).on('keydown', function(e) {
  var target;
	if((e.which == 13 && (e.metaKey || e.ctrlKey))){  
    // cmd-enter to submit forms
  	target = e.target;
  	if(target.form) {
  		$(target.form).submit();
  	}
  } else if (e.which == 27) {
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

var getSortCookie = function(){
  return document.cookie.replace(/(?:(?:^|.*;\s*)sort\s*\=\s*([^;]*).*$)|^.*$/, "$1");
};

if(Array.prototype.find) {
  Array.prototype.find = function(func) {
    for (var i = 0; i < this.length; i++) {
      if (func(this[i], i, this)) return this[i];
    }
    return undefined;
  };
}

var emptyMessage = function(markup) {
  var currentText = $('#empty-message p').text();
  var newText = $('<div/>').append(markup).find('p').text();
  if (currentText === newText) {
    return;
  }
  $('#replies').html(`
    <div id='empty-message'>
      ${markup}
    </div>
  `);
  setTimeout(function() {
    $('#empty-message').addClass('in');
  }, 0);
};



/*
 * Boot App
 */

var setupEnv = function(auid){
  fb = new Firebase('https://canned-replies.firebaseio.com/' + auid + '/replies');
  var auth = fb.getAuth() ? fetch() : login(token, fetch);
};

if ( inIframe() ) {
  var card = new SW.Card();

  card.services('helpdesk').on('showTicket', id => {
    ticket = id;
  });

  card.onActivate(environment => {
    setupEnv(environment.app_host.auid);
  });  
} else {
  setupEnv('username');
}

setSort(getSortCookie() || 'useCount');
$(document.body).addClass( window.location.search.substr(1) );

// Show useful messages for connection states
setTimeout(function(){
  if (state.fbConnection === undefined) {
    emptyMessage(`<p>${strings.connecting}</p>`);
  }
}, 2000);
setTimeout(function(){
  if (state.fbConnection === undefined) {
    emptyMessage(`<p>${strings.loginFailed}</p>`);
  }
}, 10000);

new Firebase('https://canned-replies.firebaseio.com/.info/connected').on('value', function(connected){
  var prev = state.fbConnection;
  var now = connected.val();
  
  if ( prev === true && !now ) { // Lost Connection
    growl(strings.offline, 'error');
  } else if ( prev === false && now ) { // Reestablished Connection
    clearGrowls();
    growl(strings.online);
  } else if ( prev === undefined && now ) { // First Connection
  }
  
  if(prev !== undefined || now){
    state.fbConnection = now;
  }
  
});

