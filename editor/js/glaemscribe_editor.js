/*

Glǽmscribe (also written Glaemscribe) is a software dedicated to
the transcription of texts between writing systems, and more 
specifically dedicated to the transcription of J.R.R. Tolkien's 
invented languages to some of his devised writing systems.

Copyright (C) 2015 Benjamin Babut (Talagan).

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.

*/  
  
GlaemscribeEditor = function()
{
  var editor = this;
    
  editor.mode     = null;
  editor.charset  = null;

  delete CodeMirror.keyMap.pcDefault["Shift-Ctrl-F"]; // Replace 
  delete CodeMirror.keyMap.pcDefault["Shift-Ctrl-R"]; // Replace all
  delete CodeMirror.keyMap.macDefault["Cmd-Alt-F"];   // Replace
  delete CodeMirror.keyMap.macDefault["Shift-Cmd-Alt-F"]; // Replace all
  delete CodeMirror.keyMap.macDefault["Ctrl-F"]; // ??
  
  CodeMirror.keyMap.pcDefault["Ctrl-R"]   = "replace"; 
  
  CodeMirror.keyMap.macDefault["Cmd-F"]   = "find";
  CodeMirror.keyMap.macDefault["Ctrl-F"]  = "find";
  CodeMirror.keyMap.macDefault["Cmd-R"]   = "replace";
  CodeMirror.keyMap.macDefault["Ctrl-R"]  = "replace";
  
  
  editor.codemirror     = CodeMirror.fromTextArea($("#code")[0], {
    lineNumbers: true,
    tabSize: 2,
    indentWithTabs: "false",
    readOnly:false,
    mode: "glaemscribe",
    theme: "vibrant-ink"
  });
  
  editor.codemirror.setOption("extraKeys", {
    Tab: function(cm) {
      var spaces = Array(cm.getOption("indentUnit") + 1).join(" ");
      cm.replaceSelection(spaces);
    }
  });
   
  editor.charEditor = $("#modal_char_editor");
  editor.charEditor.normalCharEditor = editor.charEditor.find("#char_editor");
  editor.charEditor.virtualCharEditor = editor.charEditor.find("#virtual_char_editor");
          
  editor.tweakKeyboardEvents();
  editor.installCallbacks();
  editor.newSession();
  editor.refreshTranscription();
  
  alertify.glaemsuccess = alertify.extend("glaemsuccess");
  
  editor.alertNavigator();
}

GlaemscribeEditor.prototype.debuggerShouldApplyPostProcessor = function()
{
  return $("#debugger_apply_postprocessor").is(':checked');
}

GlaemscribeEditor.prototype.alertNavigator = function()
{
  var isOpera = !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
  // Opera 8.0+ (UA detection to detect Blink/v8-powered Opera)
  var isFirefox = typeof InstallTrigger !== 'undefined';   // Firefox 1.0+
  var isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;
  // At least Safari 3+: "[object HTMLElementConstructor]"
  var isChrome = !!window.chrome && !isOpera;              // Chrome 1+
  var isIE = /*@cc_on!@*/false || !!document.documentMode; // At least IE6
  
  if(!isFirefox && !isChrome)
  {
    alertify.log("It is advised to work with Firefox or Chrome !!","error",10000);
  }
}

GlaemscribeEditor.prototype.tweakKeyboardEvents = function()
{
  var editor = this;
  
  window.addEventListener("beforeunload", function (event) {
    event.returnValue = "\n\nYou're about to quit Glaemscribe Editor.\n\nThis warning is here to save you from losing your unsaved work !\n\n";
  });
  
  // Prevent the backspace key from navigating back.
  $(document).unbind('keydown').bind('keydown', function (event) {
    
    var doPrevent = false;
    
    if (event.keyCode === 8) { // Tab
      var d = event.srcElement || event.target;
      if ((d.tagName.toUpperCase() === 'INPUT' && 
      (
        d.type.toUpperCase() === 'TEXT' ||
        d.type.toUpperCase() === 'PASSWORD' || 
        d.type.toUpperCase() === 'FILE' || 
        d.type.toUpperCase() === 'SEARCH' || 
        d.type.toUpperCase() === 'EMAIL' || 
        d.type.toUpperCase() === 'NUMBER' || 
        d.type.toUpperCase() === 'DATE' )
      ) || 
      d.tagName.toUpperCase() === 'TEXTAREA') {
        doPrevent = d.readOnly || d.disabled;
      }
      else {
        doPrevent = true;
      }
    }
    
    // Prevent ctrl + R, F5, etc ... except for that DAMMIT SAFARI.
    if (event.keyCode == 116 || ( (event.ctrlKey || event.metaKey) && event.keyCode == 82) )
      doPrevent = true;
  
    // Prevent ctrl + S, a bad reflex... maybe commit instead ?
    if ( ( (event.ctrlKey || event.metaKey) && event.keyCode == 83) )
    {
      editor.showCommitPannel(true);
      doPrevent = true;
    }
    
    if (doPrevent) {
      event.preventDefault();
    }

  });    
}


 
GlaemscribeEditor.prototype.installCallbacks = function()
{
  var editor        = this;
  var codemirror    = editor.codemirror;

  codemirror.on("change", function(cm, change) {
      
    if(codemirror.realChangeTimer)
      clearTimeout(codemirror.realChangeTimer);
    codemirror.realChangeTimer = setTimeout(function() {  
      editor.refreshMode();        
    }, 1000);      
      
  });
    
  $(".entry").on('change keyup paste',function() {
    editor.refreshTranscription();
  });
  $(".debugger_entry").on('change keyup paste',function(e) {
    editor.refreshDebuggerTranscription();
  });  
      
  $("#font_name").on('change keyup paste',function() {
    editor.refreshFontAll();
    editor.refreshMode();
  });
  $("#charset_name").on('change keyup paste',function() {
    editor.refreshCharset();
    editor.refreshMode();
  });
 
  $("#session_file_import").find(".customOpenButton").find("input").change(function () {
    editor.importSession();
    $("#session_file_import").find(".customOpenButton").find("input").val(""); 
  });       
  $("#mode_file_import").find(".customOpenButton").find("input").change(function () {
    editor.importMode();
    $("#mode_file_import").find(".customOpenButton").find("input").val(""); 
  });    
  $("#charset_file_import").find(".customOpenButton").find("input").change(function () {
    editor.importCharset();
    $("#charset_file_import").find(".customOpenButton").find("input").val(""); 
  });     
  
  $("#export_session_button").click(function() {
    editor.exportSession();
  });
  $("#export_mode_button").click(function() {
    editor.exportMode();
  });
  $("#export_mode_js_button").click(function() {
    editor.exportMode(true);
  });
  /*
  $("#export_charset_button").click(function() {
    editor.exportCharset();
  });
  $("#export_charset_js_button").click(function() {
    editor.exportCharset(true);
  });
  */
  
  $(".char_editor_button.cancel").click(function() {
    editor.cancelCharEdition();
  })
  $(".char_editor_button.ok").click(function() {
    editor.confirmCharEdition();
  })
  $(".char_editor_button.trash").click(function() {
    editor.trashCharEdition();
  })
  $(".char_code_edit").on("change keyup paste",function() {
    editor.charCodeChanging();
  });
  
  $("#new_session_button").click(function() {
    alertify.confirm("Are you sure you want to star a new session from scratch ? <br><br>All uncommited changes will be lost.", function (e) {
      if(e)
        editor.newSession(true);
      else {}
    });    
  });
  
  $("#open_session_button").click(function() {
  
    var session_list  = $("#session_list");
    var was_visible   = session_list.is(":visible");
    editor.closeSubEditors();
        
    if(was_visible)
      return;
         
    session_list.show();
    session_list.html("");
    
    if(localStorage.length == 0)
    {
      session_list.append($("<div class='no_sessions'>No sessions in local storage.</div>"));
    }
    else
    {    
      session_list.append($("<div class='session_header'>Sessions</div>"));    
      
      for ( var i = 0, len = localStorage.length; i < len; ++i ) {
        
        var sname = localStorage.key( i );     
        var entry = $("<div data-name='" + sname + "'/>");
        
        entry.addClass("session_entry");
              
        var entry_name = $("<div class='session_entry_name'>" + sname + "</div>");        
        var trash_button = $("<div class='session_trash_button fa fa-trash'></div>");
        
        entry.append(entry_name);
        entry.append(trash_button);
        
        trash_button.click(function(evt) {
          evt.stopPropagation();
          
          var elt = $(this);
          var session_name = elt.parent().data('name');
          
          alertify.confirm("Are you sure you want to delete session <br><br><i><b>" + session_name + "</b></i> ? <br><br>This is not recoverable.",function (e) {
            if(e)
            {
              localStorage.removeItem(session_name);
              if($("#session_name").val() == session_name)
                editor.newSession();
              
              alertify.glaemsuccess("Removed session <b><i>" + session_name + "</i></b>.");              
              editor.closeSubEditors();
            }
            else {}
          });
          
          return false;
        })
        
        entry.click(function() {
          var t     = $(this);
          var tname = t.data("name");
                   
          alertify.confirm("Are you sure you want to load session <br><br><i><b>" + tname + "</b></i> ? <br><br>All uncommited changes will be lost.",function (e) {
            if(e)
              editor.openSession(tname);
            else {}
          });
          
        });
        
        session_list.append(entry);
      }
    }
    
  })
  
  $("#commit_history_button").click(function() {
    
    var commit_list  = $("#commit_list");
    var was_visible  = commit_list.is(":visible");
    editor.closeSubEditors();
        
    if(was_visible)
      return;
         
    commit_list.show();
    commit_list.html("");
    
    var session_name = $("#session_name").val();
    
    var session_object = {};
    
    try { session_object = JSON.parse(localStorage.getItem(session_name)); }
    catch(e){}
    session_object = session_object || {} 
    
    var commits = (session_object['commits'] || []);
    
    if(commits.length == 0)
    {
      commit_list.append($("<div class='no_commits'>No commits yet in the current session.</div>"));    
    }
    else
    {
      commit_list.append($("<div class='commit_header'>Session commits</div>"));    
      
      $.each(commits,function(num,obj) {
        var cname       = new Date(obj['date']);    
        var dateLocale  = cname.toLocaleString();
    
        var commit_name = (dateLocale + ((num == 0)?(" (LATEST)"):(""))); 
        var entry       = $("<div class='commit-entry' data-name='" + commit_name +"' data-num='" + num + "'/>");
        
        entry.addClass("commit_entry");
                 
        var entry_name    = $("<div class='commit_entry_name'>" + commit_name  + "</div>");            
        var trash_button  = $("<div class='commit_trash_button fa fa-trash'></div>");
        
        entry.append(entry_name);
        entry.append(trash_button);
        
        trash_button.click(function(evt) {
          evt.stopPropagation();
          
          var elt   = $(this);
          var cname = elt.parent().data('name')
          var cnum  = elt.parent().data('num');
          
          alertify.confirm("Are you sure you want to delete commit <br><br><i><b>" + cname + "</b></i> ? <br><br>This is not recoverable.",function (e) {
            if(e)
            {
              // Patch the commits, store the session
              commits.splice(cnum,1);
              session_object['commits'] = commits;
              localStorage.setItem(session_name, JSON.stringify(session_object));
              alertify.glaemsuccess("Removed commit <b><i>" + cname + "</i></b> from session <b><i>" + session_name +"</i></b>."); 
              editor.closeSubEditors();
            }
            else {}
          });
          
          return false;
        })        
      
        entry.click(function() {
          var t     = $(this);
          
          alertify.confirm("Are you sure you want to load commit <br><br><i><b>" + dateLocale + "</b></i> ? <br><br>All uncommited changes will be lost.",function (e) {
            if(e)
              editor.openCommit(obj);
          });
          
        });
        commit_list.append(entry);  
      });
    }
    
  })
  
  $("#commit_session_button").click( function() {
    editor.showCommitPannel();
  });
  
  $("#confirm_commit_session_button").click(function() {
    editor.confirmCommit();
  });
  
  $("#commit_session_name").keydown(function (ev) {
    var keycode = (ev.keyCode ? ev.keyCode : ev.which);
  
    if (keycode == '13') {
      editor.confirmCommit();
    }
    else if (keycode == '27') {
      // Escape
      editor.closeSubEditors();
    }
    else
    {
      //  alert(keycode)
    }
  });
  
  $("#display_debugger_info").click(function() {
    $("#modal_debugger").fadeIn();
    editor.refreshDebuggerTranscription();
    
    // This is a little dirty but firefox needs this for tooltips to work
    // Or the boundingclientrect of svg elements will be incorrect
    setTimeout(function() { 
      editor.debug_tree = new GlaemDebugTree(editor,$("#processor_tree")) 
      setTimeout(function() {  
        $("svg").hide(); 
        setTimeout(function() { $("svg").show() },0);
      }, 0);   
    },0);   
  })
  $(".debugger_entry").on('change keyup paste',function() {
    editor.refreshDebuggerTranscription();
  });
  $("#debugger_apply_postprocessor").change(function() {
    editor.refreshDebuggerTranscription();
    editor.refreshDebuggerPlusPostLabels();
  })
  
  $("#close_debugger_button").click(function() {
    $("#modal_debugger").fadeOut();    
  })          
  
  $("#about_button").click(function() {
    alertify.alert("<div style='font-size:30px'>Glaemscribe Editor</div><br><div>Version 1.0.0</div><br>By Benjamin <i>Talagan</i> Babut © 2015<br><br>")
  })
  
  $("#doc_button").click(function() {
    $("#doc_link")[0].click();
  })  
  
  $(".editor_button.find").click(function() {
    editor.codemirror.execCommand("find")
  })
  $(".editor_button.find_next").click(function() {
    editor.codemirror.execCommand("findNext")
  })
  $(".editor_button.find_previous").click(function() {
    editor.codemirror.execCommand("findPrev")
  })
  $(".editor_button.replace").click(function() {
    editor.codemirror.execCommand("replace")
  })
  
  var font_size = 1;
  $("#font_up_button").click(function() {
    font_size += 0.2;
    $(".transcribed").css("font-size", font_size + "em");
  })
  $("#font_down_button").click(function() {
    font_size -= 0.2;
    $(".transcribed").css("font-size", font_size + "em");
  })
  $("#copy_to_clipboard_button").click(function() {
    
    var text = $(".transcribed").text();
    
    if (window.clipboardData && window.clipboardData.setData) {
      // IE specific code path to prevent textarea being shown while dialog is visible.
      return clipboardData.setData("Text", text); 

    } else if (document.queryCommandSupported && document.queryCommandSupported("copy")) {
      var textarea = document.createElement("textarea");
      textarea.textContent = text;
      textarea.style.position = "fixed";  // Prevent scrolling to bottom of page in MS Edge.
      document.body.appendChild(textarea);
      textarea.select();
      try {
        ret = document.execCommand("copy");  // Security exception may be thrown by some browsers.
        alertify.glaemsuccess("Transcription copied to clipboard! Note : some web browsers (like Firefox) may break non-breaking spaces.");
        return ret;
      } catch (ex) {
        alertify.alert("Copying to the clipboard failed. Might not be supported by your browser.");
        return false;
      } finally {
        document.body.removeChild(textarea);
      }
    }
  })
  $("#save_transcription_to_txt_button").click(function() {
    
    var getTimeStamp = function dateToYMD(date) {
        var d = date.getDate();
        var m = date.getMonth() + 1;
        var y = date.getFullYear();
        var hh = date.getHours();
        var mm = date.getMinutes(); 
        var ss = date.getSeconds()
        var dalign = function(num) {
          return (num<=9 ? '0' + num : num)
        }
        return '' + y + dalign(m) + dalign(d) + dalign(hh) + dalign(mm) + dalign(ss) ;
    }
    
    var filename  = "glaem_transcript_" + getTimeStamp(new Date()) + ".txt";
    var content   = $(".transcribed").text();
  
    var dlink     = $('#save_transcription_to_txt_anchor');
    dlink.attr({
      download: filename,
      href: "data:application/text;charset=utf-8," + encodeURIComponent(content),
    });
    dlink[0].click();
  });

}

GlaemscribeEditor.prototype.showCommitPannel = function(force)
{
  var editor = this;
  var commit_session_pannel = $("#commit_session_pannel");
  var was_visible = commit_session_pannel.is(":visible");
  editor.closeSubEditors();
  
  if(was_visible && !(force == true))
    return;
  
  var current_session_name = $("#session_name").val();
  $("#commit_session_name").val(current_session_name);
  
  commit_session_pannel.show();
  $("#commit_session_name").focus();
  var input = $("#commit_session_name")[0];
  // Set cursor at the end
  input.selectionStart = input.selectionEnd = input.value.length;
}

GlaemscribeEditor.prototype.confirmCommit = function()
{
  var editor = this;
  var session_name = $("#commit_session_name").val();
  
  if(session_name.trim() == "")
  {
    alertify.alert("You have to provide a session name in which to commit !");
    return;
  }
  else
  {
    editor.commit(session_name);
    $("#session_name").val(session_name);
  }
}

  
GlaemscribeEditor.prototype.importSession = function()
{
  var editor    = this;
    
  var f         = $("#session_file_import").find(".customOpenButton").find("input")[0].files[0];
  var fr        = new FileReader();
   
  fr.onloadend  = function(e){ 
    
    var obj         = JSON.parse(fr.result);
    var sessionname = obj['name'];
    var content     = obj['content'];
      
    if(sessionname && content)
    {
      localStorage.setItem(sessionname,content);
      alertify.glaemsuccess("Imported session <b><i>" + sessionname + "</i></b> into local storage."); 
    }
    else
    {
      alertify.alert("Something really went wrong.");
    }
  }  
  fr.readAsText(f,"utf-8");    
}  
  
GlaemscribeEditor.prototype.importMode = function()
{
  var editor    = this;

  var f         = $("#mode_file_import").find(".customOpenButton").find("input")[0].files[0];
  var fr        = new FileReader();
   
  fr.onloadend  = function(e){ 
    
    var modename  = f.name.replace(".glaem","");

    // Rename the mode
    $("#mode_name").val(modename);
    
    editor.codemirror.setValue(fr.result); 
    editor.refreshMode();
    
    alertify.glaemsuccess("Imported mode <b><i>" + modename + "</i></b> into current session."); 
  }  
  fr.readAsText(f,"utf-8");     
}

GlaemscribeEditor.prototype.importCharset = function()
{
  var editor    = this;
    
  var f         = $("#charset_file_import").find(".customOpenButton").find("input")[0].files[0];
  var fr        = new FileReader();
  
  fr.onloadend  = function(e){ 
      
    var charset_name = f.name.replace(".cst","");
    var raw          = fr.result;
       
    editor.loadCharsetFromContent(charset_name, raw);
    
    alertify.glaemsuccess("Imported charset <b><i>" + charset_name + "</i></b> into current session.");     
  };
  fr.readAsText(f,"utf-8");   
}

GlaemscribeEditor.prototype.loadCharsetFromContent = function(charset_name, raw)
{
  var editor  = this;
  
  var parser  = new Glaemscribe.CharsetParser();
  var charset = parser.parse_raw(charset_name,raw);
    
  // Rename the charset
  $("#charset_name").val(charset_name);      
  editor.charset = charset;
    
  editor.refreshCharset();
  editor.refreshMode();
  editor.refreshFontAll();
  editor.refreshTranscription();
}

//=========//
// EXPORTS //
//=========//

GlaemscribeEditor.prototype.exportMode = function(is_js)
{
  var editor    = this;    
  var modename  = $("#mode_name").val();      
  
  if(modename == "")
  {
    alertify.alert("Please give a name to your mode before exporting it!");
    return;
  }
  
  var filename  = modename + ".glaem";
  var content   = editor.codemirror.getValue();
  
  if(is_js)
  {
    filename    += ".js";
    content     = "Glaemscribe.resource_manager.raw_modes[\"" + modename + "\"] = \"" + JSON.stringify(content).slice(1,-1) + "\" \n";
  }
  
  var dlink     = $('#export_mode_anchor');
  dlink.attr({
    download: filename,
    href: "data:text/glaeml;charset=utf-8," + encodeURIComponent(content),
  });
  dlink[0].click();
}


GlaemscribeEditor.prototype.exportSession = function()
{
  var editor    = this;    
  var sessionname  = $("#session_name").val();      
  
  if(sessionname == "")
  {
    alertify.alert("This session has no name and cannot be exported. Please commit at least once.");
    return;
  }
  
  var filename      = sessionname + ".sess";
  var obj           = {};
  obj['name']       = sessionname
  obj['content']    = localStorage.getItem(sessionname);
  var content       = JSON.stringify(obj);
  
  var dlink     = $('#export_session_anchor');
  dlink.attr({
    download: filename,
    href: "data:text/sess;charset=utf-8," + encodeURIComponent(content),
  });
  dlink[0].click();
}


GlaemscribeEditor.prototype.serializeCurrentCharset = function() 
{
  var editor        = this;
  var charsetname   = $("#charset_name").val();      
  
  var content = "\\** Charset '" + charsetname + "' exported from Glaemscribe Editor. **\\ \n\n";
  for(var i=0;i<editor.charset.chars.length;i++)
  {
    var c = editor.charset.chars[i];
    if(c.is_virtual())
    {
      content += "\\beg virtual " + c.names.join(" ") + "\n";
      if(c.reversed)
        content += "  \\reversed\n";
      if(c.default)
        content += "  \\default " + c.default + "\n";
      
      glaemEach(c.classes, function(_, vc) {
        content += "\\class " + vc.target + "\t\t" + vc.triggers.join(" ") + "\n";
      });
      content += "\\end\n\n"
    }
    else if(c.is_sequence()) {
      content += "\\beg seq " + c.names.join(" ") + "\n";
      content += "  " + c.sequence.join(" ") + "\n";
      content += "\\end\n\n"
      
    }
    else  
      content += "\\** " + c.str + " **\\ \\char " + parseInt(c.code).toString(16) + " " + c.names.join(" ") + "\n";
  }  
  return content;
}

/*
GlaemscribeEditor.prototype.exportCharset = function(is_js)
{
  var editor        = this;    
  var charsetname   = $("#charset_name").val();      
  
  if(charsetname == "")
  {
    alertify.alert("Please give a name to your charset before exporting it!");
    return;
  }
  
  var filename  = charsetname + ".cst";
  var content   = editor.serializeCurrentCharset();

  if(is_js)
  {
    filename += ".js";
    content     = "Glaemscribe.resource_manager.raw_charsets[\"" + charsetname + "\"] = \"" + JSON.stringify(content).slice(1,-1) + "\" \n";
  }
  
  var dlink     = $('#export_charset_anchor');
  dlink.attr({
    download: filename,
    href: "data:text/cst;charset=utf-8," + encodeURIComponent(content),
  });
  dlink[0].click()  
}
*/
//=====//
// GUI //
//=====//

GlaemscribeEditor.prototype.closeSubEditors = function()
{
  var editor = this;
  
  $("#session_list").hide();
  $("#commit_session_pannel").hide();
  $("#commit_list").hide();
  editor.charEditor.hide();
}
  
GlaemscribeEditor.prototype.refreshMode = function()
{
  var editor  = this;
  var raw     = editor.codemirror.getValue();
  var parser  = new Glaemscribe.ModeParser();
  editor.mode = parser.parse_raw("current",raw,editor.getOptionsFromGUI());
  editor.refreshOptionsGUI();
  editor.refreshTranscription();
}
  
GlaemscribeEditor.prototype.refreshCharset = function()
{ 
  var editor = this;
  
  if(!editor.charset)
    return;
  
  // Reset the current charset 
  var charset_name                                            = $("#charset_name").val();
  editor.charset.name                                         = charset_name; 
  Glaemscribe.resource_manager.loaded_charsets                = {};
  Glaemscribe.resource_manager.loaded_charsets[charset_name]  = editor.charset;
  
  var t = $(".charset_table table");
  t.html("");
    
  var tr = $("<tr/>");
  
  /* 
  // CHARSET EDITOR REMOVED, TO BE REWRITTEN
  var th = $("<th id='add_char_button' class='add_char_button'><div class='fa fa-plus'></div</th>");  
  
  th.click(function() {
    editor.charEditorAskedOn($(this),-1);
  });
  
  tr.append(th);
  */
  tr.append("<th>U+X</th><th>C</th><th class='left'>Names</th>");
  
  t.append(tr);  
    
  for(var i=0;i<editor.charset.chars.length;i++)
  {
    var c = editor.charset.chars[i];
    if(c.is_virtual() || c.is_sequence())
      continue;
    
    var tr = $("<tr class='char_entry' data-num='" + i + "'/>");
    
    /* 
    // CHARSET EDITOR REMOVED, TO BE REWRITTEN
    var edit_button = $("<td class='edit_char_button'><div class='fa fa-pencil'></div></td>");
    
    edit_button.click(function() {
      var elt=$(this);
      editor.charEditorAskedOn(elt,parseInt(elt.parent().data("num")));
    });
    
    tr.append(edit_button);
    */
    tr.append("<td>" + parseInt(c.code).toString(16) + "</td><td class='char'>" + c.str + "</td><td class='left'>" + c.names.join("<br>") + "</td>");
    t.append(tr);
  }
  
  var tr = $("<tr/>");
  
  /* 
  // CHARSET EDITOR REMOVED, TO BE REWRITTEN
  var th = $("<th id='add_virtual_char_button' class='add_char_button'><div class='fa fa-plus'></div</th>");  
  
  th.click(function() {
    editor.charEditorAskedOn($(this),-2);
  });
  
  tr.append(th);
  */
  tr.append("<th>V</th><th></th><th class='left'>Virtual Char names</th>");
  
  t.append(tr);  
  
  for(var i=0;i<editor.charset.chars.length;i++)
  {
    var c = editor.charset.chars[i];
    if(!c.is_virtual())
      continue;
    
    var tr = $("<tr class='char_entry' data-num='" + i + "'/>");
    
    /* 
    // CHARSET EDITOR REMOVED, TO BE REWRITTEN
    var edit_button = $("<td class='edit_char_button'><div class='fa fa-pencil'></div></td>");
    
    edit_button.click(function() {
      var elt=$(this);
      editor.charEditorAskedOn(elt,parseInt(elt.parent().data("num")));
    });
    tr.append(edit_button);
    */
    tr.append("<td>X</td><td class='char'></td><td class='left'>" + c.names.join("<br>") + "</td>");
    t.append(tr);
  }
  
  var tr = $("<tr/>");
  
  tr.append("<th>S</th><th></th><th class='left'>Sequence Char names</th>");
  
  t.append(tr);  
  
  for(var i=0;i<editor.charset.chars.length;i++)
  {
    var c = editor.charset.chars[i];
    if(!c.is_sequence())
      continue;
    
    var tr = $("<tr class='char_entry' data-num='" + i + "'/>");
    
    /* 
    // CHARSET EDITOR REMOVED, TO BE REWRITTEN
    var edit_button = $("<td class='edit_char_button'><div class='fa fa-pencil'></div></td>");
    
    edit_button.click(function() {
      var elt=$(this);
      editor.charEditorAskedOn(elt,parseInt(elt.parent().data("num")));
    });
    tr.append(edit_button);
    */
    tr.append("<td>X</td><td class='char'></td><td class='left'>" + c.names.join("<br>") + "</td>");
    t.append(tr);
  }
}  
  
GlaemscribeEditor.prototype.refreshFont = function(widget, have_errors)
{
  var editor = this;
        
  var font_name = $("#font_name").val();
  if(have_errors)
  {
    widget.css("font-family", "");
    widget.css("line-height", "1em");
  }
  else
  {
    widget.css("font-family", font_name);      
    widget.css("line-height", "2em");
  }
}

GlaemscribeEditor.prototype.refreshFontAll = function()
{
  var editor = this;
  
  editor.refreshFont($(".transcribed"));
  editor.refreshFont($(".debugger_transcribed"));
  editor.refreshFont($(".char"));
  editor.refreshFont($(".char_preview"));
}
  
GlaemscribeEditor.prototype.refreshOptionsGUI = function()
{
  var editor          = this;
  
  // Get former options to restore
  var current_options = editor.getOptionsFromGUI();
        
  $(".options").html("");
    
  if(!editor.mode)
    return;
        
  if(Object.keys(editor.mode.options).length == 0)
  {
    $(".options").html("<div>No options for mode.</div>");      
  }
  else
  {
    glaemEach(editor.mode.options, function(key, opt) {
     
      var cdiv    = $("<div/>");
      var control = null;
      
      if(opt.type == Glaemscribe.Option.Type.BOOL)
      {
        var default_checked = (opt.default_value_name == "true")?("checked"):("");
        var checked         = default_checked;
        
        if(current_options[opt.name] != null)
          checked = (current_options[opt.name] == true)?("checked"):("");
          
        var res     = '<input class="mode_option bool" type="checkbox" name="' + opt.name + '" value="true" ' + checked + ' >';
        var control = $(res);
        cdiv.append(control);
        cdiv.append(opt.name);
      }
      else
      {       
        var res = "<select class='mode_option enum' name='" + opt.name + "'>";
        glaemEach(opt.values, function(val_name, val) {
           
          var default_selected = (opt.default_value_name == val_name)?("selected"):("");
          var selected         = default_selected;
          
          if(current_options[opt.name] != null)
            selected = (current_options[opt.name] == val_name)?("selected"):("");
                    
          res += "<option value='" + val_name + "'" + selected + ">" + val_name + "</option>";        
        });
        res += "</select>";
        var control = $(res);
        cdiv.append(opt.name);
        cdiv.append(control);   
      } 
      
      control.on("change",function() {
        if(!editor.mode)
          return;
        
        editor.mode.finalize(editor.getOptionsFromGUI());
        editor.refreshTranscription();
      });
          
      $(".options").append(cdiv);   
    });
  }  
}

GlaemscribeEditor.prototype.getOptionsFromGUI = function()
{
  var editor = this;
  var opt    = {};
  
  $(".options").find(".mode_option").each(function() {
    var widget = $(this);
    if(widget.hasClass('bool'))
      opt[widget.attr("name")] = widget.is(":checked");
    else
      opt[widget.attr("name")] = widget.val();
  });
  return opt;
}

GlaemscribeEditor.prototype.genericRefreshTranscription = function(entry_selector, transcribed_selector, debug_preprocessor_selector, debug_processor_selector, debug_postprocessor_selector, debug_processor_pathes_selector, debug_should_apply_postprocessor)
{
  var editor          = this;
  var failure         = false;
  var failure_message = "";
    
  if(editor.mode && editor.mode.raw.trim() != "")
  {     
    editor.refreshFont(transcribed_selector, editor.mode.errors.length > 0);
      
    if(editor.mode.errors.length == 0)
    {
      var tinfo     = editor.mode.transcribe(entry_selector.val(),editor.charset);
      var success   = tinfo[0];
      var ret       = tinfo[1];
      var dbg_ctx   = tinfo[2];
     
      if(success)
      {
        editor.refreshFont(transcribed_selector, false);
        transcribed_selector.html(ret.replace(/\n/g,"<br/>"));
        
        if(debug_preprocessor_selector) 
          debug_preprocessor_selector.html(dbg_ctx.preprocessor_output);
        
        if(debug_processor_selector)    
        {
          var po = dbg_ctx.processor_output.filter(function(n){ return n != "" }).join(" &bull; ");
          
          debug_processor_selector.html(po);          
        }
        
        if(debug_postprocessor_selector)
        {
          var po = dbg_ctx.postprocessor_output;
          debug_postprocessor_selector.html(po);
          editor.refreshFont(debug_postprocessor_selector, false); 
        }
        
        if(debug_processor_pathes_selector)
        {
          debug_processor_pathes_selector.html("");
                 
          glaemEach(dbg_ctx.processor_pathes, function(path_index,path) {
              
            if(path[0] == '_')
              return true;
              
            var tr = $("<tr/>");
            
            var td1 = $("<td class='inpath'/>");
            var td2 = $("<td class='trpath'/>");
            var td3 = $("<td class='lipath'/>");
            
            var preview = path[2];
            
            preview = editor.mode.post_processor.apply(path[2], editor.charset);
            
            var inner1 = $("<div>").html(path[0]);
            var inner2 = $("<div>").html(preview);
            var inner3 = $("<div>").html(path[1].filter(function(n){ return n != "" }).join(" &bull; "));
            
            var cb = function() {
              editor.debug_tree.highlight_path(path[0]);
            };
            
            td1.append(inner1);tr.append(td1);
            td2.append(inner2);tr.append(td2);
            td3.append(inner3);tr.append(td3);
            debug_processor_pathes_selector.append(tr);
         
            td1.mousedown(cb);
            td2.mousedown(cb);
            td3.mousedown(cb);  
              
          });
                   
          editor.refreshFont(debug_processor_pathes_selector.find(".trpath"),false);         
        }
      }  
      else
      {
        failure_message = "The transcription failed:<br><br>" + ret;
        failure = true;
      }
    }
    else
    {
      var str = "";
      glaemEach(editor.mode.errors, function(e,error) {
        str += error.line + ": " + error.text + "<br>";
      });
      
      failure_message = "Mode has some errors:<br><br>" + str;
      failure         = true;
    }
  }
  else
  {
    failure_message = "Your mode is currently empty.";
    failure         = true;
  }  
  
  if(!failure)
    return;
  
  // This went wrong gggggh
  
  editor.refreshFont(transcribed_selector, true);
  transcribed_selector.html(failure_message);
  
  if(debug_preprocessor_selector) 
    debug_preprocessor_selector.html("");
  
  if(debug_processor_selector)
  {
    debug_processor_selector.html("");
    editor.refreshFont(debug_processor_selector, true);  
  }

  if(debug_processor_pathes_selector)
    debug_processor_pathes_selector.html("");
}
  
GlaemscribeEditor.prototype.refreshTranscription = function()
{
  var editor = this;
  editor.genericRefreshTranscription($(".entry"),$(".transcribed"));
}

GlaemscribeEditor.prototype.refreshDebuggerTranscription = function()
{
  var editor = this;
  editor.genericRefreshTranscription($(".debugger_entry"),
  $(".debugger_transcribed"),
  $(".preprocessor_output"),
  $(".processor_output"),
  $(".postprocessor_output"),
  $(".processor_followed_pathes table"),
  editor.debuggerShouldApplyPostProcessor());
}

GlaemscribeEditor.prototype.refreshDebuggerPlusPostLabels = function()
{
  var editor = this;
  $(".debugger_plus_post").toggle(editor.debuggerShouldApplyPostProcessor());
}
/* 
// CHARSET EDITOR REMOVED, TO BE REWRITTEN
GlaemscribeEditor.prototype.charEditorAskedOn = function(char_row, char_num)
{
  var editor      = this;
  
  var was_visible = editor.charEditor.is(":visible");
  var was_on_num  = editor.last_edited_char_num;
  
  editor.closeSubEditors();
  if(was_visible && was_on_num == char_num)
    return;
  
  editor.last_edited_char_num = char_num;

  var char = editor.charset.chars[char_num];

  var is_virtual = (char_num == -2) || (char != null && char.is_virtual());
  
  if(is_virtual == false)
  {
    editor.charEditor.normalCharEditor.show();
    editor.charEditor.virtualCharEditor.hide();
    if(char_num == -1)
    {
      $("#char_code_edit").val("00");
      $("#char_names_edit").val("NEW_NAME");
      $("#char_preview").html(String.fromCodePoint(0));
      $(".char_editor_button.trash").hide();
    }
    else
    {
  
      $("#char_code_edit").val(parseInt(char.code).toString(16));
      $("#char_names_edit").val(char.names.join(" "));
      $("#char_preview").html(String.fromCodePoint(char.code));
      $(".char_editor_button.trash").show();
    }
  }
  else
  {
    editor.charEditor.normalCharEditor.hide();
    editor.charEditor.virtualCharEditor.show();
    var class_editor = editor.charEditor.virtualCharEditor.find(".virtual_char_editor_classes");
    class_editor.html("");
    for(var i = 0; i<10; i++)
      class_editor.append("<div class='class_edit' data-num='" + i + "'><span class='class_edit_target'><input class='class_target' placeholder='Target'/></span><span class='class_edit_triggers'><input class='class_triggers' placeholder='Triggers'/></span></div>");
       
    if(char_num == -2)
    {    
      $(".virtual_char_names_edit").val("NEW_NAME");
      $(".char_editor_button.trash").hide();     
    }
    else
    {
      $(".virtual_char_names_edit").val(char.names.join(" "));
      $(".virtual_char_default_edit").val(char.default);
      $(".virtual_char_reversed_edit").prop("checked",char.reversed);
      glaemEach(char.classes, function(c,vclass) {
        var row = $(".class_edit[data-num='" + c +"']");
        row.find(".class_target").val(vclass.target);
        row.find(".class_triggers").val(vclass.triggers.join(" "));
      });
      $(".char_editor_button.trash").show();
    }
  }
  
  editor.charEditor.show();
}
*/

/* 
// CHARSET EDITOR REMOVED, TO BE REWRITTEN
GlaemscribeEditor.prototype.charCodeChanging = function()
{
  var editor = this;
  
  var codestr = $("#char_code_edit").val() || 0;
  var code = parseInt(codestr,16);
  
  $("#char_preview").html(String.fromCodePoint(code)); 
}
*/

/* 
// CHARSET EDITOR REMOVED, TO BE REWRITTEN
GlaemscribeEditor.prototype.cancelCharEdition = function()
{
  var editor = this;
  editor.closeSubEditors();
}
*/

/* 
// CHARSET EDITOR REMOVED, TO BE REWRITTEN
GlaemscribeEditor.prototype.confirmCharEdition = function()
{
  var editor = this;
 
  var edited_char = null;
  if(editor.last_edited_char_num >= 0)
    edited_char = editor.charset.chars[editor.last_edited_char_num];  
 
  if(editor.last_edited_char_num == -1 || (edited_char && !edited_char.is_virtual() ))
  {
    var code    = parseInt($("#char_code_edit").val(), 16);
    var names   = $("#char_names_edit").val().split(/\s+/);
    if(editor.last_edited_char_num == -1)
    {
      edited_char         = editor.charset.add_char(0,code,names);        
    }
    else
    {
      edited_char.code    = code;
      edited_char.names   = names;
      edited_char.str     = String.fromCodePoint(code);     
    }
  }
  else if(editor.last_edited_char_num == -2 || (edited_char && edited_char.is_virtual() ))
  {
    var names   = $("#virtual_char_names_edit").val().split(/\s+/);
    var classes = [];
    for(var i=0;i<10;i++)
    {
      var row     = $(".class_edit[data-num='" + i +"']");
      var vc      = new Glaemscribe.VirtualChar.VirtualClass();
      vc.target   = row.find(".class_target").val(); 
      vc.triggers = stringListToCleanArray(row.find(".class_triggers").val(),/\s/);
      
      if(vc.target != "" || vc.triggers.length > 0)
        classes.push(vc);
    }
    var reversed  = $("#virtual_char_reversed_edit").is(":checked");
    var deflt     = $("#virtual_char_default_edit").val().trim();
    
    if(editor.last_edited_char_num == -2)
    {
      edited_char = editor.charset.add_virtual_char(0,classes,names,reversed,deflt);
    }
    else
    {
      edited_char.classes   = classes;
      edited_char.names     = names;
      edited_char.reversed  = reversed;
      edited_char.default   = deflt;
    }
  }

  editor.charset.finalize();  
  editor.refreshCharset();
  editor.refreshMode();
  editor.refreshFontAll();
  editor.refreshTranscription();
  editor.closeSubEditors();
}
*/

/* 
// CHARSET EDITOR REMOVED, TO BE REWRITTEN
GlaemscribeEditor.prototype.trashCharEdition = function()
{
  var editor = this;
  alertify.confirm("Really trash this char?", function (e) {
    if(e)
    {
      // Remove it from charset
      editor.charset.chars.splice(editor.last_edited_char_num,1);
      
      // Remove it from html list, renumerate all chars
      var tr_to_remove  = $(".charset_table table").find("tr[data-num='" + editor.last_edited_char_num + "']")[0];
      var trs           = $(".charset_table table").find("tr.char_entry");
      
      var i = 0;
      $.each(trs, function() {
        var elt = $(this);    
        if(elt[0] != tr_to_remove)
        {
          elt.attr("data-num",i);
          i++;
        }
      });
      $(tr_to_remove).fadeOut(function() { tr_to_remove.remove() });
      
      editor.charset.finalize();
      editor.refreshMode();   
      editor.closeSubEditors();
    }
    else {}
  });  
}
*/
//////////////
// SESSIONS //
//////////////

GlaemscribeEditor.prototype.openSession = function(session_name)
{
  var editor = this;
  var session_object = {}
  try { session_object = JSON.parse(localStorage.getItem(session_name)); }
  catch(e){}
  session_object = session_object || {} 
  
  // Session update 
  $("#session_name").val(session_name);
  
  // Get the latest commit
  var commit_object = (session_object['commits'] || [])[0] || {};
  
  // Open it
  editor.openCommit(commit_object,true)
  
  alertify.glaemsuccess("Opened session <b><i>" + session_name + "</i></b>.");
}

GlaemscribeEditor.prototype.openCommit = function(commit_object,skip_alert)
{
  var editor = this;
  
  // Charset update
  editor.loadCharsetFromContent(commit_object['charset_name'] || "", commit_object['charset_content'] || "");

  // Mode update
  $("#mode_name").val(commit_object['mode_name'] || "");
  editor.codemirror.setValue(commit_object['mode_content'] || "");
  
  // Font update
  $("#font_name").val(commit_object['font_name'] || "");
   
  // Transcription update
  $("#entry").val(commit_object['entry'] || "");
  
  // Refresh the whole GUI
  editor.closeSubEditors();
  editor.refreshDebuggerPlusPostLabels();
  editor.refreshMode();
  editor.refreshFontAll();
  editor.refreshTranscription();
  
  if(!skip_alert)
    alertify.glaemsuccess("Opened commit <b><i>" + (new Date(commit_object['date'])).toLocaleString() + "</i></b>.");
    
}

GlaemscribeEditor.prototype.commit = function(session_name)
{ 
  var editor = this;
  
  var session_object = {};
  
  try { session_object = JSON.parse(localStorage.getItem(session_name)); }
  catch(e){}
  session_object = session_object || {} 
  
  session_object['commits'] = (session_object['commits'] || []);
  
  // Create a new commit object
  var commit_object                 = {};
  commit_object['date']             = new Date();
  commit_object['entry']            = $("#entry").val();
  commit_object['mode_name']        = $("#mode_name").val();
  commit_object['mode_content']     = editor.codemirror.getValue();
  commit_object['charset_name']     = $("#charset_name").val();
  commit_object['charset_content']  = editor.serializeCurrentCharset();
  commit_object['font_name']        = $("#font_name").val();  
   
  // Add the commit to the session
  session_object['commits'].unshift(commit_object);
     
  // Store the session
  localStorage.setItem(session_name, JSON.stringify(session_object));
  
  alertify.glaemsuccess("Commited session <b><i>" + session_name + "</i></b> to latest commit <b><i>" + commit_object['date'].toLocaleString() + "</i></b>.");
     
  editor.closeSubEditors();  
}

////////////////

GlaemscribeEditor.aimode =  "\\language \"A Language\"\n\\writing  \"Tengwar\"\n\\mode\t\t\t\"Your mode name\"\n\\authors\t\"Your name\"\n\\version\t\"1.0.0 alpha\"\n\n\\charset  new_charset true\n\n\\beg preprocessor\n\t\\downcase\n\\end\n\n\\beg processor\n\t\\beg rules litteral\n\t\tai --> YANTA A_TEHTA_L\t\n\t\\end\n  \n  \\beg rules punctuation\n\t\t! --> PUNCT_EXCLAM\n\t\\end\n\\end\n" ;
GlaemscribeEditor.aicharset =  "\\char 6c YANTA          \n \\char 45 A_TEHTA_L       \n \\char c1 PUNCT_EXCLAM"

GlaemscribeEditor.prototype.newSession = function(with_alert)
{
  var editor = this;
  $("textarea").val("");
  $("input").val("");
  editor.codemirror.setValue("");
  $("#mode_name").val("new_mode");
  $("#charset_name").val("new_charset");
  $("#font_name").val("Tengwar Sindarin Glaemscrafu");
  $("#entry").val("Ai !");
  editor.loadCharsetFromContent("new_charset",GlaemscribeEditor.aicharset);
  editor.codemirror.setValue(GlaemscribeEditor.aimode);
  
  editor.refreshDebuggerPlusPostLabels();
  editor.refreshFontAll();
  editor.refreshMode();
  
  if(with_alert)
    alertify.glaemsuccess("Created new session from scratch.");   
}


