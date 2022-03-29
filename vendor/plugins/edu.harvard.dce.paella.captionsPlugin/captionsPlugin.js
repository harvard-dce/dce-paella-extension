// #DCE's version of the caption plugin, adapted from UPV's caption plugin
// Adapted for Paella 6.1.2
// TODO: assets new updates with the latest UPV caption plugin!
paella.addPlugin(function () {
  return class DceCaptionsPlugin extends paella.ButtonPlugin {
    
    constructor () {
      super();
      this._searchTimerTime = 1500;
      this._searchTimer = null;
      this._pluginButton = null;
      this._open = 0; // 0 closed, 1 st click
      this._parent = null;
      this._body = null;
      this._inner = null;
      this._bar = null;
      this._input = null;
      this._select = null;
      this._switch = null; // OPC-436 switch div for on-off toggle
      this._editor = null;
      this._activeCaptions = null;
      this._lastSel = null;
      this._browserLang = null;
      this._defaultBodyHeight = 280;
      this._autoScroll = true;
      this._autoScrollEvent = false; // #DCE OPC-427 fix auto scroll
      this._searchOnCaptions = null;
      this._headerNoteKey = "automated",
      this._headerNoteMessage = "Automated Transcription - Provided by IBM Watson";
      this._hasTranscriptText = null;
      this._noTextFoundMessage = "No text was found during transcription.";
      this._dceLangDefault = null; /*  OPC-407 reselect lang option when CC button clicked */
      this._dceLangDefaultFound = null;
    }
    
    getAlignment () {
      return 'right';
    }
    getSubclass () {
      return 'dceCaptionsPluginButton';
    }
    getIconClass() {
      return 'icon-closed-captions';
    }
    getName () {
      return "edu.harvard.dce.paella.captionsPlugin";
    }
    getButtonType () {
      return paella.ButtonPlugin.type.popUpButton;
    }
    getDefaultToolTip () {
      return paella.utils.dictionary.translate("Captions");
    }
    getIndex () {
      return 664;
    }
    getAriaLabel() {
      return paella.utils.dictionary.translate("Captions");
    }
    
    closeOnMouseOut () {
      return false; /* UPV https://github.com/polimediaupv/paella/commit/34f99cfcfe6bc9a52331bdab2a0c4948102cd716 */
      // #DCE OPC-436 close on mouse out when  selecting language is Ok if option select is changed to checkbox or unorded list
    }
    
    checkEnabled (onSuccess) {
      if (paella.captions.getAvailableLangs().length > 0) {
        onSuccess(true);
      } else {
        onSuccess(false);
      }
    }
    
    showUI () {
      if (paella.captions.getAvailableLangs().length >= 1) {
        super.showUI();
      }
    }
    
    setup () {
      var self = this;
      
      // HIDE UI IF NO Captions
      if (paella.captions.getAvailableLangs().length < 1) {
        paella.plugins.captionsPlugin.hideUI();
      }
      
      // MATT-2219 prevent activating the CC video overlay
      if (! self._hasTranscriptText) {
        paella.events.trigger(paella.events.captionsDisabled);
      }
      
      // MATT-2219 #DCE Assume no caption text if first language has no caption text
      var id = paella.captions.getAvailableLangs()[0].id;
      self._hasTranscriptText = (paella.captions.getCaptions(id)._captions !== undefined);
      if (! self._hasTranscriptText) {
        // don't do binds when no transcode text to scroll
        return;
      }
      // end  MATT-2219
      
      //BINDS
      paella.events.bind(paella.events.captionsEnabled, function (event, params) {
        self.onChangeSelection(params);
      });
      
      paella.events.bind(paella.events.captionsDisabled, function (event, params) {
        self.onChangeSelection(params);
      });
      
      paella.events.bind(paella.events.timeUpdate, function (event, params) {
        if (self._searchOnCaptions) {
          self.updateCaptionHiglighted(params);
        }
      });
      
      paella.events.bind(paella.events.controlBarWillHide, function (evt) {
        self.cancelHideBar();
      });
      
      // #DCE OPC-429 at video ended, re-enable auto-scroll to prep for video restart
      paella.events.bind(paella.events.ended, event => {
        self._autoScroll = true;
      });

      self._activeCaptions = paella.captions.getActiveCaptions();
      
      self._searchOnCaptions = self.config.searchOnCaptions || false;
    }
    
    cancelHideBar () {
      var thisClass = this;
      if (thisClass._open > 0) {
        paella.player.controls.cancelHideBar();
      }
    }

	  updateCaptionHiglighted(time) { //#DCE OPC-427 retrieve UPV upstream time start fix
      var thisClass = this;
      var sel = null;
      var id = null;
      if(time){
        paella.player.videoContainer.trimming()
          .then((trimming) => {
            let offset = trimming.enabled ? trimming.start : 0;
            let c = paella.captions.getActiveCaptions();
            let caption = c && c.getCaptionAtTime(time.currentTime + offset);
            let id = caption && caption.id;
  
            if(id != null){
              sel = $( ".bodyInnerContainer[sec-id='"+id+"']" );
  
              if(sel != thisClass._lasSel){
                $(thisClass._lasSel).removeClass("Highlight");
              }
  
              if(sel){
                $(sel).addClass("Highlight");
                if(thisClass._autoScroll){
                  thisClass.updateScrollFocus(id);
                }
                thisClass._lasSel = sel;
              }
            }
          });
      }
    }
    
    updateScrollFocus (id) {
      let sel = $( ".bodyInnerContainer[sec-id='"+id+"']" );
      let prevSel = $( ".bodyInnerContainer[sec-id='"+ (id-1) +"']" );
      // add scroll buffer of the previous caption line
      if (prevSel.length > 0 ) {
        sel = prevSel;
      }
      if (sel.length > 0 ) {
        this._autoScrollEvent = true; // #DCE OPC-427 fix auto scroll
        $(".dceCaptionsBody").scrollTop(sel[0].offsetTop); // #DCE OPC-427 fix scroll position
      }
    }

    changeSelection () {
      var thisClass = this;
      // #DCE OPC-436 re-write on-off toggle to simplify it stop browser control of option element styling
      var sel = $("#show-captions-switch:checked").length > 0 ? this._dceLangDefault: "";
      
      // Reload the default captions if non selected last time
      if (sel == "") {
        $(thisClass._body).empty();
        $(thisClass._input).val(""); // unset search item when turning off captions
        $("#captionsBarInput").css('display','inherit');
        paella.captions.setActiveCaptions(sel);
        return;
      }

      // reload the selected captions
      paella.captions.setActiveCaptions(sel);
      thisClass._activeCaptions = sel;
      if (thisClass._searchOnCaptions) {
        thisClass.buildBodyContent(paella.captions.getActiveCaptions()._captions, "list");
      }
      // #DCE OPC-436 close on focus out or click button, but not on selection change
      //thisClass.setButtonHideShow();
      //thisClass.onClose();
      //paella.player.controls.hidePopUp(thisClass.getName());
    }
    
    onChangeSelection (obj) {
      var thisClass = this;
      
      if (thisClass._activeCaptions != obj) {
        $(thisClass._body).empty();
        if (obj == undefined) {
          thisClass._select.value = "";
          $(thisClass._input).prop('disabled', true);
          $(thisClass._input).val(""); // unset search item when disabling
          $(thisClass._switch).prop("aria-checked", false);
          $(thisClass._switch).prop("checked", false);
          $("#captionsBarInput").css('visibility','hidden');
        } else {
          $(thisClass._input).prop('disabled', false);
          $(thisClass._switch).prop("aria-checked", true);
          $(thisClass._switch).prop("checked", true);
          $("#captionsBarInput").css('visibility','visible');
          thisClass._select.value = obj;
          thisClass._dceLangDefaultFound = true;
          if (thisClass._searchOnCaptions) {
            thisClass.buildBodyContent(paella.captions.getActiveCaptions()._captions, "list");
          }
        }
        thisClass._activeCaptions = obj;
        thisClass.setButtonHideShow();
      }
      if (thisClass._open) {
        // OPC-407 close after selection
        // OPC-436 only close on focus out
        //thisClass.onClose();
        //paella.player.controls.hidePopUp(thisClass.getName());
      }
    }
    
    action () {
      var self = this;
      self._browserLang = paella.utils.dictionary.currentLanguage();
      self._autoScroll = true;
      
      switch (self._open) {
        case 0:
        self.onOpen();
        break;
        
        case 1:
        self.onClose();
        break;
      }
    }

    onOpen() {
      if (this._browserLang && paella.captions.getActiveCaptions() == undefined) {
        this.selectDefaultOrBrowserLang(this._browserLang);
      }
      // OPC-407 re-enable existing captions on click open
      if (this._select && this._select.value === "" && this._dceLangDefaultFound) {
          this._select.value = this._dceLangDefault;
          this.changeSelection();
      }

      // reset the last search to empty
      if ($(this._input).val() !== "") {
          $(this._input).val("");
          this.doSearch("");
      }

       this._open = 1;
       paella.keyManager.enabled = false;
    }

    onClose() {
      paella.keyManager.enabled = true;
      this._open = 0;
    }

    buildContent (domElement) {
      var thisClass = this;
      
      //captions CONTAINER
      thisClass._parent = document.createElement('div');
      thisClass._parent.className = 'dceCaptionsPluginContainer';
      //captions BAR
      thisClass._bar = document.createElement('div');
      thisClass._bar.className = 'dceCaptionsBar';
      //captions BODY
      if (thisClass._hasTranscriptText) {
        // build caption search and select UI elements
        if (thisClass._searchOnCaptions) {
          thisClass.buildSearch();
          thisClass.buildSelect();
        }
      } else {
        // create the empty body
        thisClass._body = document.createElement('div');
        thisClass._body.className = 'dceCaptionsBody';
        thisClass._parent.appendChild(thisClass._body);
        thisClass._inner = document.createElement('div');
        thisClass._inner.className = 'bodyInnerContainer';
        thisClass._inner.innerHTML = thisClass._noTextFoundMessage;
        thisClass._body.appendChild(thisClass._inner);
      }
      
      //BUTTON EDITOR
      thisClass._editor = document.createElement("button");
      thisClass._editor.className = "editorButton";
      thisClass._editor.innerHTML = "";
      thisClass._bar.appendChild(thisClass._editor);
      
      //BUTTON jQuery
      $(thisClass._editor).prop("disabled", true);
      $(thisClass._editor).click(function () {
        var c = paella.captions.getActiveCaptions();
        paella.userTracking.log("paella:caption:edit", {
          id: c._captionsProvider + ':' + c._id, lang: c._lang
        });
        c.goToEdit();
      });
      if (paella.dce && paella.dce.captiontags) {
        thisClass._addTagHeader(thisClass._parent, paella.dce.captiontags);
      }
      domElement.appendChild(thisClass._parent);

      // #DCE OPC-436 caption fade, set onClose params when hidding popup
      $(domElement).mouseleave(function (evt) {
        thisClass.onClose();
        paella.player.controls.playbackControl().hidePopUp(thisClass.getName(), thisClass.button);
      });
    }
    buildSearch () {
      var thisClass = this;
      thisClass._body = document.createElement('div');
      thisClass._body.className = 'dceCaptionsBody';
      thisClass._parent.appendChild(thisClass._body);
      //BODY JQUERY
      $(thisClass._body).scroll(function () {
        // #DCE OPC-427 fix automatic transcription popup scrolling
        if (thisClass._autoScrollEvent) {
          thisClass._autoScrollEvent = false;  // reset the current auto event flag
        } else {
          thisClass._autoScroll = false; // this scroll was manual, so stop auto scrolling
        }
      });
      
      //INPUT
      thisClass._input = document.createElement("input");
      thisClass._input.className = "captionsBarInput";
      thisClass._input.type = "text";
      thisClass._input.id = "captionsBarInput";
      thisClass._input.name = "captionsString";
      thisClass._input.placeholder = paella.utils.dictionary.translate("Search captions");
      thisClass._bar.appendChild(thisClass._input);
      
      //INPUT jQuery
      $(thisClass._input).change(function () {
        var text = $(thisClass._input).val();
        thisClass.doSearch(text);
      });
      
      $(thisClass._input).keyup(function () {
        var text = $(thisClass._input).val();
        if (thisClass._searchTimer != null) {
          thisClass._searchTimer.cancel();
        }
        thisClass._searchTimer = new paella.utils.Timer(function (timer) {
          thisClass.doSearch(text);
        },
        thisClass._searchTimerTime);
      });
    }


    // #DCE OPC-436 re-write on-off toggle to simplify it stop browser control of option element styling
    buildSelect() {
      let containerId = "show-captions-switch-container";
      let labelId = "show-captions-switch-label";
      let inputId = "show-captions-switch";
      let displayClass = "show-caption-switch-display";
      let labelText = "Show Captions";
      let thisClass = this;

      thisClass._select = document.createElement("div");
      thisClass._select.id = containerId;

      let label = document.createElement("label");
      label.setAttribute("id", labelId);
      label.setAttribute("for", inputId);
      label.textContent = labelText;

      thisClass._switch = document.createElement("input");
      thisClass._switch.setAttribute("type", "checkbox");
      thisClass._switch.setAttribute("id", inputId);
      thisClass._switch.setAttribute("role", "switch");
      thisClass._switch.setAttribute("aria-checked", false);
      // false to start
      thisClass._switch.setAttribute("disabled", "disabled");
      // disabled  until a language is found
      thisClass._switch.setAttribute("aria-labelledby", labelId);

      let displayDiv = document.createElement("div");
      displayDiv.setAttribute("class", displayClass);

      let spanOff = document.createElement("span");
      spanOff.setAttribute("class", "captions-off");
      spanOff.textContent = paella.utils.dictionary.translate("off");

      // Input must be first child of label (to accomadate styling)
      label.appendChild(thisClass._switch);

      // Find a CC lang
      var langs = paella.captions.getAvailableLangs();
      if (Array.isArray(langs) && langs.length > 0) {
        let spanOn = document.createElement("span");
        spanOn.setAttribute("class", "captions-on");
        spanOn.setAttribute("data-value", langs[0].id);
        spanOn.textContent = paella.utils.dictionary.translate("on");
        // save ref to default lang
        thisClass._dceLangDefault = langs[0].id;
        displayDiv.appendChild(spanOn);
        // turn on by default
        thisClass._switch.setAttribute("aria-checked", true);
        thisClass._switch.setAttribute("checked", true);
        thisClass._switch.removeAttribute("disabled");
      }

      // append the children
      displayDiv.appendChild(spanOff);
      label.appendChild(displayDiv);
      thisClass._select.appendChild(label);

      // attach to the parents
      thisClass._bar.appendChild(thisClass._select);
      thisClass._parent.appendChild(thisClass._bar);

      //jQuery SELECT
      $(thisClass._select).change(function () {
        thisClass.changeSelection();
      });
    }
    
    selectDefaultOrBrowserLang (code) {
      var thisClass = this;
      var provider = null;
      var fallbackProvider = null;
      paella.captions.getAvailableLangs().forEach(function (l) {
        if (l.lang.code === code) {
          provider = l.id;
        } else if (l.lang.code === paella.player.config.defaultCaptionLang) {
          fallbackProvider = l.id;
        }
      });
      
      if (provider || fallbackProvider) {
        paella.captions.setActiveCaptions(provider || fallbackProvider);
      }
      /*
      else{
      $(thisClass._input).prop("disabled",true);
      }
       */
    }
    
    doSearch (text) {
      var thisClass = this;
      var c = paella.captions.getActiveCaptions();
      // OPC-630 The c._captions is empty if the file exists but there is no talking in the video
      // Do not rebuild the body on an empty caption file
      if (c && c._captions) {
        if (text == "") {
          thisClass.buildBodyContent(c._captions, "list");
        } else {
        // OPC-228 add usertracking to caption term search. Shorten long terms.
        let maxTrackSize = 64;
        let trackingTerm = (text && text.length > maxTrackSize) ? `$ {
        text.substring(0, maxTrackSize - 4)
        }...`: text;
          paella.userTracking.log("paella:caption:search", trackingTerm);
          c.search(text, function (err, resul) {
            if (! err) {
              thisClass.buildBodyContent(resul, "search");
            }
          });
        }
      }
    }
    
    setButtonHideShow () {
      var thisClass = this;
      var editor = $('.editorButton');
      var c = paella.captions.getActiveCaptions();
      var res = null;
      if (c != null) {
        $(thisClass._select).width('39%');
        
        c.canEdit(function (err, r) {
          res = r;
        });
        if (res) {
          $(editor).prop("disabled", false);
          $(editor).show();
        } else {
          $(editor).prop("disabled", true);
          $(editor).hide();
          $(thisClass._select).width('47%');
        }
      } else {
        $(editor).prop("disabled", true);
        $(editor).hide();
        $(thisClass._select).width('47%');
      }
      
      if (! thisClass._searchOnCaptions) {
        if (res) {
          $(thisClass._select).width('92%');
        } else {
          $(thisClass._select).width('100%');
        }
      }
    }
    
    buildBodyContent (obj, type) {
      // The obj is empty if the transcript file exists but does
      // not contain text. For example, videos without spoken words.
      // Don't build body content for an empty transcript.
      if (!obj) return;
      paella.player.videoContainer.trimming()
      .then((trimming)=>{
      var thisClass = this;
      $(thisClass._body).empty();
      obj.forEach(function (l) {
        if(trimming.enabled && (l.end<trimming.start || l.begin>trimming.end)){
          return; // from UPV upstream, trim out captions before start and after end
        }
        thisClass._inner = document.createElement('div');
        thisClass._inner.className = 'bodyInnerContainer';
        thisClass._inner.innerHTML = l.content;
        if (type == "list") {
          thisClass._inner.setAttribute('sec-begin', l.begin);
          thisClass._inner.setAttribute('sec-end', l.end);
          thisClass._inner.setAttribute('sec-id', l.id);
          thisClass._autoScroll = true;
        }
        if (type == "search") {
          thisClass._inner.setAttribute('sec-begin', l.time);
        }
        thisClass._body.appendChild(thisClass._inner);

        // #DCE start trim seek fix from UPV upstream captionsPlugin
        $(thisClass._inner).click(function(){
          var secBegin = $(this).attr("sec-begin");
          paella.player.videoContainer.trimming()
          .then((trimming) => {
          let offset = trimming.enabled ? trimming.start : 0;
          paella.player.videoContainer.seekToTime(secBegin - offset + 0.01);
          });
        });
      });
     });
    }
    
    _addTagHeader (container, tags) {
      var self = this;
      if (! tags) return;
      if (((Array.isArray && Array.isArray(tags)) || (tags instanceof Array)) == false) {
        tags =[tags];
      }
      tags.forEach(function (t) {
        if (t == self._headerNoteKey) {
          var messageDiv = document.createElement("div");
          messageDiv.id = "dceCaptionNote";
          messageDiv.innerHTML = self._headerNoteMessage;
          $(container).prepend(messageDiv);
        }
      });
    }
  }
});
