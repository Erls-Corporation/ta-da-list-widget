var req;
var html;
var listSelect;
var listIds = new Array();
var listNames = new Array();
var currentList = 0;
var totalLists = 0;
var totalTodos;
var scroller = false;
var scrollArea;
var scrollBar;
var overlay;
var infoBtn;
var errorMsg;
var showingPref;
var hasLists;
var addedData = new Array();
var conn = new XHConn();

// Login to account
function login() {
	showLoading();
	var url = "http://"+getUsername()+".tadalist.com/session";
	conn.connect(url, "POST", "username="+getUsername()+"&password="+getPassword(), loggedIn);
}
// Save returned HTML + show first list
var loggedIn = function (rhtml) {
	saveHtml(rhtml);
	if (html.getElementById("username") || html.getElementById("password") || html.getElementById("errorMessage")) {
		hideLoading();
		errorMsg = true;
		gebid("title").innerHTML = "Error";
		gebid("todos").innerHTML = "Invalid username or password.<br /><span><a href=\"javascript:openLink('http://www.tadalist.com/account/login');\" id='elogin'>Login</a> from Safari first. Check Remember Me.</span>";
		updateScroller();
	} else {
		errorMsg = false;
		getLists();
	}
}

function clear() {
	listIds = new Array();
	listNames = new Array();
	html = "";
	gebid('title').innerHTML = "";
	gebid('todos').innerHTML = "";
	gebid('listSelect').innerHTML = "";
}

// Retrieve list names and urls + create dropdown
function getLists() {
	var myLists = html.getElementsByClassName("mylists")[0].getElementsByTagName("a");
	// If there are more lists from last session
	if (myLists.length > totalLists && totalLists > 0) { 
		var extra = parseFloat(myLists.length-totalLists); 
		currentList = parseFloat(currentList)+extra;
	}
	totalLists = myLists.length;
	if (totalLists > 0) {
			hasLists = true;
			for (i=0; i<totalLists; i++) {
				listIds.push(myLists[i].toString().split("/")[2]);
				listNames.push(myLists[i].innerHTML);
				if (i == currentList) {
					listSelect.innerHTML += '<option selected value="'+i+'">'+listNames[i]+'</option>';
				} else {
					listSelect.innerHTML += '<option value="'+i+'">'+listNames[i]+'</option>';
				}
			}
			getListTodos(currentList);
	} else {
		hasLists = false;
		hideLoading();
		errorMsg = true;
		gebid("title").innerHTML = "Error";
		gebid("todos").innerHTML = "You do not have any lists.<br /><span><a href=\"javascript:createList();\" id='elogin'>Create a new list</a></span>";
		updateScroller();
	}
}

// Connect to a specific todo list
function getListTodos(num) {
	showLoading();
	currentList = num;
	var url = 'http://'+getUsername()+'.tadalist.com/lists/'+listIds[num];

	conn.connect(url, "GET", "", showListTodos);
	// Set title
	gebid("title").innerHTML = '<a href="javascript:openLink(\''+url+'\');" title="'+listNames[num]+'">'+listNames[num]+'</a>';
}

// Display to-dos from specific list
var showListTodos = function(rhtml) {
	saveHtml(rhtml);
	var table = html.getElementsByTagName('ul')[0];
	totalTodos = table.getElementsByTagName('li').length;
	// Clear todo div
	todoDiv.innerHTML = "";
	for (var i=0; i<totalTodos; i++) {
		var node = table.getElementsByTagName('li')[i];
		var tempText = node.innerHTML.split('item[completed]" type="hidden" value="0">');
		var tempText2 = tempText[1].split('</form>');
		var text = tempText2[0];
		var tempId = node.id.split('class="drag_item_');
		var id = tempId[0].split('item_');
		id = id[1];
		var form = createToDoForm(id, text, i);
		todoDiv.innerHTML +=  form;
	}
	hideLoading();
	if (scroller) {
		updateScroller();
	} else {
		setScroller();
	}
}
function createToDoForm(id, text, i) {
	var form = '<form action="http://'+getUsername()+'.tadalist.com/lists/'+listIds[currentList]+'/items/'+id+'" class="edit_item" id="edit_item_'+id+'" method="post" onsubmit="new Ajax.Request(\'http://'+getUsername()+'.tadalist.com/lists/'+listIds[currentList]+'/items/'+id+'\', {asynchronous:true, evalScripts:true, method:\'put\', parameters:Form.serialize(this) });"><div style="margin:0;padding:0"><input name="_method" type="hidden" value="put"></div>';
	form += ' <input id="item_completed" name="item[completed]" onclick="this.form.onsubmit(); deleteTodo('+i+', '+id+');" type="checkbox" value="1"><input name="item[completed]" type="hidden" value="0">';
	form += text;
	form += "</form>";
	return form;
}
// Show add_todo div
function showAddTodo() {
	if (!errorMsg) {
		overlay = true;
		var new_todo = gebid("new_todo");
		var addTodoForm = '<form action="http://'+getUsername()+'.tadalist.com/lists/'+listIds[currentList]+'/items" class="new_item" id="new_item" method="post" onsubmit="new Ajax.Request(\'http://'+getUsername()+'.tadalist.com/lists/'+listIds[currentList]+'/items\', {asynchronous:true, evalScripts:true, parameters:Form.serialize(this), onSuccess: function(req) { addTodo(req.responseText) } }); return false;">';
        addTodoForm += '<input id="item_content" name="item[content]" size="40" style="width: 338px" type="text" />';
		addTodoForm += '<input type="image" src="images/add_this_item.gif" id="add_this_item" alt="Add this item" />';
		addTodoForm += '<a href="#" title="Close" id="close" onclick="hideAddTodo();">Close</a>';
        addTodoForm += '</form>';
		new_todo.innerHTML += addTodoForm;
		setTimeout("document.getElementById('item_content').focus();", 100);
		fader.toggle();
	}
}
// Add todo to list
function addTodo(rhtml) {
	addedData.push(currentList);
	var i = totalTodos;
	totalTodos++;
	var html = rhtml;
	var tempId = html.split('$("item_');
	var tempId2 = tempId[1].split('").visualEffect');
	var id = tempId2[0];
	var text = " "+gebid('item_content').value;
	gebid('item_content').value = "";
	var form = createToDoForm(id, text, i);
	todoDiv.innerHTML += form;
	hideAddTodo();
	updateScroller("bottom");
}
// Hide add_todo div
function hideAddTodo() {
	overlay = false;
	gebid("item_content").value = "";
	new_todo.innerHTML = "";
	fader.toggle();
}

// Remove todo from list
function deleteTodo(num, id) {
	totalTodos--;
	var url = "http://"+getUsername()+".tadalist.com/item/toggle/"+id+"?list_id="+listIds[currentList];
	if (totalTodos == 0) { 
		conn.connect(url, "POST", "", nextList);
	} else {
		conn.connect(url, "POST", "");
	}
	todoDiv.childNodes[num].style.display = "none";
	updateScroller();
}

// Redirect to create list page
function createList(bypass) {
	if (!errorMsg || !hasLists) {
		widget.setPreferenceForKey(true, "tempRefresh");
		widget.openURL('http://'+getUsername()+'.tadalist.com/lists/new');
	}
}

// Save the HTML from AJAX request
function saveHtml(rhtml) {
	html = document.implementation.createHTMLDocument("");
	html.open();
	html.write(rhtml.responseText);
}

// Get element by id
function gebid(id) {
	return document.getElementById(id);
}

var nextList = function () {
	currentList = 0;
	clear();
	login();
}

function showLoading() {
  	gebid('todos').innerHTML = "";
  	gebid('spinner').style.display = "block";
}

function hideLoading() {
  	gebid('spinner').style.display = "none";
}
 
function setScroller() {
    scrollBar = new AppleVerticalScrollbar(gebid("scroller"));
    scrollArea = new AppleScrollArea(gebid("container"));
    scrollArea.addScrollbar(scrollBar);
    scroller = true;
    updateScrollerHeight();
}
function updateScroller(action) {
		scrollArea.refresh();
		updateScrollerHeight();
		var h = gebid("container").offsetHeight;
    if (action == "bottom") {
    	scrollArea.verticalScrollTo(h);
    }
}
function updateScrollerHeight() {
	var h = gebid("todos").offsetHeight
	if (h <= 90) {
			gebid("scroller").style.visibility = "hidden";
    } else {
    	gebid("scroller").style. visibility = "visible";
    }
}

document.onkeydown = keyhandler;

function keyhandler() {
	var Key = window.event.keyCode;
	if (Key == 13 && !overlay && !showingPref && !errorMsg) {
   	showAddTodo();
 	} else if (Key == 13 && showingPref) {
  	hidePrefs()
 	}
}

function openLink(url) {
	if (window.widget) {
  		widget.openURL(url);
	} else {
     	window.location(url);
  }
}

function goToHome() {
   if (!errorMsg) {
      widget.openURL('http://'+getUsername()+'.tadalist.com');
   }
 }
        
function toggle(dir) {
  if (dir == 'front') {
      showingPref = false;
      gebid('front').style.display = "block";
      gebid('back').style.display = "none";
   } else if (dir == 'back') {
      showingPref = true;
      gebid('front').style.display = "none";
      gebid('back').style.display = "block";
   }
}

function showPrefs() {
 if (window.widget)
     widget.prepareForTransition("ToBack");
     toggle('back');
     gebid("username").focus();
	   setTimeout('widget.performTransition();', 0);
}

function hidePrefs() {
 if (window.widget)
    clear();
    saveLogin();
    login();
    widget.prepareForTransition("ToFront");
    toggle('front');
	  setTimeout('widget.performTransition();', 0);
}

function saveLogin() {
	var username = gebid("username").value;
	var password = gebid("password").value;
	var refresh =  gebid("refresh").checked;
	if (username == "") username = "blank";
	if (password == "") password = "blank";
	widget.setPreferenceForKey(username, "username");
	widget.setPreferenceForKey(password, "password");
	widget.setPreferenceForKey(refresh, "refresh");
}
function getUsername() {
	return widget.preferenceForKey("username");
}
function getPassword() {
	return widget.preferenceForKey("password");
}
function getRefresh() {
	return widget.preferenceForKey("refresh");
}
function getTempRefresh() {
	var temp = widget.preferenceForKey("tempRefresh");
	if (temp == true) {
		widget.setPreferenceForKey(false, "tempRefresh");
	}
	return temp;
}
widget.onshow = function() {
	if (getRefresh() == true || getTempRefresh() == true) {
		clear();
		login();
	}
}
widget.onhide = function() {
	if (addedData.length > 0) {
		if (addedData[addedData.length-1] == currentList) {
			currentList = 0;
		}
	addedData = new Array();
	}
}
window.onload = function() {
	fader = new fx.Opacity('new_todo', {duration: 175});
	fader.hide();
	todoDiv = gebid("todos");
	listSelect = gebid("listSelect");
	infoBtn = new AppleInfoButton(document.getElementById("infoButton"), document.getElementById("front"), "black", "black", showPrefs);
	if (getUsername != "" && getPassword != "") {
     	gebid("username").value = getUsername();
     	gebid("password").value = getPassword();
     	gebid("refresh").checked = getRefresh();
     	clear();
     	login();
    } else {
		setTimeout ('showPrefs();', 1000);
	}
}
String.prototype.trim = function () {
    return this.replace(/^\s*/, "").replace(/\s*$/, "");
}