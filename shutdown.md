# <img src="https://cdnjs.cloudflare.com/ajax/libs/emojione/2.1.0/assets/svg/1f4e2.svg" width="16px">Announcement (8/1/16)<img src="https://cdnjs.cloudflare.com/ajax/libs/emojione/2.1.0/assets/svg/1f4e2.svg" width="16px">
Sad news: Canned Replies will be shut down on September 15th <img src="https://cdnjs.cloudflare.com/ajax/libs/emojione/2.1.0/assets/svg/1f622.svg" width="16px">. I no longer have the time I need to maintain it, let alone work on new features.

Bottom Line: On **September 15th**, Canned Replies will **stop working**, and will be removed from the App Center. Please **export your replies** before that date.


## Questions/Answers

### How do I export my canned replies?
I made it as easy as I could to get your data out <img src="https://cdnjs.cloudflare.com/ajax/libs/emojione/2.1.0/assets/svg/1f4e4.svg" width="16px">:

1. Load the Canned Replies page (http://your-helpdesk-host/apps/canned-replies)
2. With your mouse, drag to select all of your replies
3. Copy to your clipboard
4. You'll now have all your replies, each separated by `---`, ready to paste

### What am I supposed to use now?
Help Desk has built in functionality for managing common ticket replies, called "Help Desk Responses".

### Why don't you open-source the code?
Actually, [I did][github]! It's been open source from the beginning. Fork away <img src="https://cdnjs.cloudflare.com/ajax/libs/emojione/2.1.0/assets/svg/1f374.svg" width="16px">!

### I'm interested in rebooting Canned Replies
That's not a question. Regardless, I'd <img src="https://cdnjs.cloudflare.com/ajax/libs/emojione/2.1.0/assets/svg/2665.svg" width="16px"> love <img src="https://cdnjs.cloudflare.com/ajax/libs/emojione/2.1.0/assets/svg/2665.svg" width="16px"> to have someone republish their own version of Canned Replies. All you need is a [Firebase][firebase] plan, [the code][github], and a [new App][sw-dev] listed on the App Center.

Canned Replies is hosted on the Firebase [Flame plan][fbplans] at $25/mo (it has *way* more than the 100 simultaneous connections allowed on the free Spark plan), but they've since released  [Blaze][fbplans], which looks like it would be around $10-12/mo for Canned Replies.

If you can get it hosted and realeased before September 15, I'd be ecstatic to update this announcement and send people your way.

[github]: https://github.com/nickchristensen/canned-replies
[firebase]: https://firebase.google.com
[fbplans]: https://firebase.google.com/pricing/
[sw-dev]: https://developers.spiceworks.com
