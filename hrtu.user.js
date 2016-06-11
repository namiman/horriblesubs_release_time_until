// ==UserScript==
// @name         Horriblesubs Release Time Until
// @namespace    horriblesubs_release_time_until
// @description  Change times on horriblesubs to "until/ago", highlight shows you're watching, and highlights newly added shows, and adds links to various anime databases
// @homepageURL  https://github.com/namiman/horriblesubs_release_time_until
// @author       namiman
// @version      1.3.2
// @date         2016-06-10
// @include      /^https?:\/\/horriblesubs\.info\/.*/
// @downloadURL  https://raw.githubusercontent.com/namiman/horriblesubs_release_time_until/master/hrtu.user.js
// @updateURL    https://raw.githubusercontent.com/namiman/horriblesubs_release_time_until/master/hrtu.meta.js
// @grant        none
// ==/UserScript==

console.log( "Horriblesubs Release Time Until userscript loaded" );

var user_shows_key = 'hrtu_user_shows';
var all_shows_key = 'hrtu_all_shows';
var version_key = 'hrtu_last_version';
var is_new_install = false;
var current_version = '1.3.2';
var user_shows = JSON.parse( localStorage.getItem( user_shows_key ) );
if ( ! user_shows )
	user_shows = {};
var all_shows = JSON.parse( localStorage.getItem( all_shows_key ) );
if ( ! all_shows )
	all_shows = {};
var script_version = localStorage.getItem( version_key );
if ( ! script_version ) {
	is_new_install = true;
	script_version = current_version;
}

function updateVersion() {
	if ( is_new_install ) {
		console.log( "HRTU version: "+ current_version );
		showAlert( 'Congratulations on installing <a href="https://github.com/namiman/horriblesubs_release_time_until/">HRTU</a>. You may find instructions on the <a href="/release-schedule/">release schedule</a> page. <div class="close">x</div>' );
	}
	localStorage.setItem( version_key, current_version );
}

var weekdays = [
	"YABOI", // horriblesubs starts the week on monday, not sunday
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
	"Sunday"
];

function parseTime( str ) {
	var match = str.match( /(\d+):(\d+)/ );
	return {
		hours: match[1],
		minutes: match[2]
	};
}
function timeAgo( hours, minutes, day ) {
	var now = new Date();
	var dst_start = new Date( now.getFullYear(), 3, 8 );
	var dst_end = new Date( now.getFullYear(), 11, 1 );
	var offset = ( now > dst_start && now < dst_end ) ? -7 : -8 ;
	var pacific_time = new Date( now.getTime() + ( offset * 3600 * 1000 ) );

	var time_show = new Date( pacific_time.getFullYear(), pacific_time.getMonth(), pacific_time.getDate(), 0, 0, 0 );
	var pacific_day = pacific_time.getDay();
	// if it is sunday(pacific), then the actual day will be 0, but horriblesubs day will be 7, so set it to 0, but only on sundays
	var day_diff = ( day == 7 && pacific_day === 0 ) ? 0 : ( day - pacific_day );
		time_show.setDate( pacific_time.getDate() + day_diff );
		time_show.setHours( parseInt( hours ) + parseInt( offset ) );
		time_show.setMinutes( minutes );

	var time_units;
	var time_until = Math.round( ( time_show - pacific_time ) / 1000 / 60 );
	var time_direction = (time_until > 0) ? 1 : (time_until === 0) ? 0 : -1;
	time_until = Math.abs( time_until );
	if ( time_until === 0 )
		time_units = '';
	else if ( time_until > 60 ) {
		time_until = ( time_until / 60 ).toFixed( 1 );
		time_units = ( time_until > 1 ) ? 'hours' : 'hour';
	}
	else
		time_units = ( time_until > 1 ) ? 'minutes' : 'minute';

	var ending_phrase = (time_direction > 0) ? 'until' : (time_direction === 0) ? 'now' : 'ago';

	return {
		'text': ( time_direction === 0 ) ? ending_phrase : time_until + ' ' + time_units + ' ' + ending_phrase,
		'time': time_until,
		'direction': time_direction
	};
}

function linkIdentifier( link ) {
	return link.substr( link.lastIndexOf( '/' ) + 1 );
}

function sideBar() {
	if ( ! jQuery( ".schedule-today:not( .hrtu_sidebar )" ).length ) {
		console.warn( "Horriblesubs Release Time Until sideBar(): Unable to find '.schedule-today'" );
		return false;
	}
	
	jQuery( ".schedule-today:not( .hrtu_sidebar ) .schedule-table tr" ).each(function(){
		var row = jQuery(this);
		var title_el = row.find( ".schedule-widget-show" );
		var no_link = false;
		if ( ! title_el.length ) {
			title_el = row.find( ".schedule-show" );
			no_link = true;
		}
		if ( ! title_el.hasClass( "hrtu_sidebar_show_name" ) ) {
			title_el.addClass( "hrtu_sidebar_show_name" );
		}
		var title, link;
		if ( no_link ) {
			title = fixTitle( title_el.text() );
			title_el.text( title );
		}
		else {
			title = fixTitle( title_el.find( "a" ).text() );
			link = linkIdentifier( title_el.find( "a" ).attr( "href" ) );
			title_el.find( "a" ).text( title );
		}

		if ( isUserShow( title, link ) )
			row.addClass( "hrtu_sidebar_highlight" );
		else
			row.removeClass( "hrtu_sidebar_highlight" );

		if ( ! isAllShow( title, link ) )
			row.addClass( "hrtu_sidebar_highlight_new" );
		else
			row.removeClass( "hrtu_sidebar_highlight_new" );
		
		var time_el = row.find( '.schedule-time' );
		var time_text;
		if ( time_el[0].hasAttribute( 'data-hrtu-time' ) )
			time_text = time_el.attr( 'title' );
		else
			time_text = time_el.text();
		var match = parseTime( time_text );
		var today = new Date();
		var show = timeAgo( match.hours, match.minutes, today.getDay() );
		time_el
			.attr( 'title', time_text )
			.attr( 'data-hrtu-time', show.time )
			.text( show.text )
			.addClass( 'hrtu_time' );
		if ( show.direction < 0 )
			time_el.addClass( 'hrtu_release_page_time_passed' );
	});

	jQuery( ".schedule-today:not( .hrtu_sidebar ) .schedule-table" ).on( "click", ".hrtu_sidebar_highlight_new .hrtu_sidebar_show_name", function( event ){
		var el = jQuery(this)[0];
		if ( event.offsetX < el.offsetWidth ) {
			var anchor_el = jQuery( el ).find( "a" ).first();
			var title, link;
			if ( ! anchor_el.length ) {
				var show_el = jQuery( el ).find( ".schedule-show" );
				title = fixTitle( show_el.text() );
			}
			else {
				title = fixTitle( anchor_el.text() );
				link = linkIdentifier( anchor_el.attr( "href" ) );
			}
			addShow( title, link );
			releasePage();
			sideBar();
		}
	});
}

function fixTitle( str ) {
	return str.replace( /\u2013|\u002D/g, "-" );
}

function addShow( title, link ) {
	if ( typeof all_shows[ title ] !== "undefined" ) {
		if ( link ) {
			all_shows[ link ] = 1;
			delete all_shows[ title ];
		}
		else {
			all_shows[ title ] = 1;
		}
	}
	else {
		if ( link )
			all_shows[ link ] = 1;
		else
			all_shows[ title ] = 1;
	}
	localStorage.setItem( all_shows_key, JSON.stringify( all_shows ) );
}

function isAllShow( title, link ) {
	if ( ( typeof all_shows[ title ] !== "undefined" ) ) {
		if ( link ) {
			all_shows[ link ] = JSON.parse( JSON.stringify( all_shows[ title ] ) );
			delete all_shows[ title ];
		}
		else {
			all_shows[ title ] = 1;
		}
		localStorage.setItem( all_shows_key, JSON.stringify( all_shows ) );
		return true;
	}
	else {
		return ( typeof all_shows[ link ] !== "undefined" );
	}
}

function addUserShow( title, link ) {
	if ( typeof user_shows[ title ] !== "undefined" ) {
		if ( link ) {
			user_shows[ link ] = 1;
			delete user_shows[ title ];
		}
		else {
			user_shows[ title ] = 1;
		}
	}
	else {
		if ( link )
			user_shows[ link ] = 1;
		else
			user_shows[ title ] = 1;
	}
	localStorage.setItem( user_shows_key, JSON.stringify( user_shows ) );
}

function removeUserShow( title, link ) {
	delete user_shows[ title ];
	delete user_shows[ link ];
	localStorage.setItem( user_shows_key, JSON.stringify( user_shows ) );
}
function isUserShow( title, link ) {
	if ( ( typeof user_shows[ title ] !== "undefined" ) ) {
		if ( link ) {
			user_shows[ link ] = JSON.parse( JSON.stringify( user_shows[ title ] ) );
			delete user_shows[ title ];
		}
		else {
			user_shows[ title ] = 1;
		}
		localStorage.setItem( user_shows_key, JSON.stringify( user_shows ) );
		return true;
	}
	else {
		return ( typeof user_shows[ link ] !== "undefined" );
	}
}

function releasePage() {
	if ( ! jQuery( '.entry-content' ).length || ! jQuery( '.entry-content' ).children().length ) {
		console.warn( "Horriblesubs Release Time Until releasePage(): Unable to find release entries" );
		return false;
	}

	if ( ! jQuery( '.hrtu_instructions' ).length ) {
		jQuery( jQuery( ".entry-content ul" ).get(0) ).append(
			'<li class="hrtu_instructions">Click [+] or [-] on shows you\'re watching to highlight them</li>' +
			'<li class="hrtu_instructions">Shows with [NEW] are newly listed, click on [NEW] to unmark individual shows or <span id="hrtu_unmark_all_new">click&nbsp;here</span> to unmark all of them at once.</li>'
		);
	}

	jQuery( '#hrtu_unmark_all_new' ).click(function(){
		jQuery( '.schedule-page-show' ).each(function(){
			var anchor_el = jQuery(this).find( "a" ).first();
			var title = fixTitle( anchor_el.text() );
			var link = linkIdentifier( anchor_el.attr( "href" ) );
			addShow( title, link );
			releasePage();
			sideBar();
		});
	});

	var entry_day;
	jQuery( '.entry-content' ).children().each(function(){
		var time_text = '';
		var el = jQuery(this);
		if ( el.hasClass( 'weekday' ) ) {
			if ( el.text() == "To be scheduled" )
				entry_day = 'tbd';
			else
				entry_day = weekdays.indexOf( el.text() );
		}
		else if ( el.hasClass( 'schedule-today-table' ) ) {
			el.find( '.schedule-page-show' ).each(function(){
				var title_el = jQuery(this);
				var anchor_el = title_el.find( "a" ).first();
				var title = fixTitle( anchor_el.text() );
				var link = linkIdentifier( anchor_el.attr( "href" ) );
				anchor_el.text( title );

				/* set up user shows */
				if ( isUserShow( title, link ) )
					title_el.parent().addClass( "hrtu_release_page_highlight" );
				else
					title_el.parent().removeClass( "hrtu_release_page_highlight" );
				if ( ! title_el.find( '.hrtu_release_page_toggle' ).length ) {
					title_el.append( '<div class="hrtu_release_page_toggle"></div>' );
					title_el.on( "click", ".hrtu_release_page_toggle", function(e){
						var title = jQuery(this).parent().find( "a" ).text();
						var is_saved = jQuery(this).parent().parent().hasClass( "hrtu_release_page_highlight" );
						if ( is_saved ) {
							removeUserShow( title, link );
							hrtuSidebarRemoveShow( title );
						}
						else
							addUserShow( title, link );
						releasePage();
						sideBar();
						e.stopPropagation();
					});
				}

				/* set up new show */
				if ( ! isAllShow( title, link ) ) {
					title_el.parent().addClass( "hrtu_release_page_highlight_new" );
					if ( ! title_el.find( '.hrtu_release_page_toggle_new' ).length ) {
						title_el.append( '<div class="hrtu_release_page_toggle_new"></div>' );
						title_el.on( "click", ".hrtu_release_page_toggle_new", function(e){
							var title = jQuery(this).parent().find( "a" ).text();
							addShow( title, link );
							releasePage();
							sideBar();
							e.stopPropagation();
						});
					}
				}
				else
					title_el.parent().removeClass( "hrtu_release_page_highlight_new" );
			});
			el.find( '.schedule-show' ).each(function(){
				var title_el = jQuery(this);
 				var title = fixTitle( title_el.text() );
				title_el.text( title );

				/* set up user shows */
				if ( isUserShow( title ) )
					title_el.parent().addClass( "hrtu_release_page_highlight" );
				else
					title_el.parent().removeClass( "hrtu_release_page_highlight" );
				if ( ! title_el.find( '.hrtu_release_page_toggle' ).length ) {
					title_el.append( '<div class="hrtu_release_page_toggle"></div>' );
					title_el.on( "click", ".hrtu_release_page_toggle", function(e){
						var el = jQuery(this);
						var title = el.parent().text();
						var is_saved = el.parent().parent().hasClass( "hrtu_release_page_highlight" );
						if ( is_saved ) {
							removeUserShow( title );
							hrtuSidebarRemoveShow( title );
						}
						else {
							addUserShow( title );
						}
						releasePage();
						sideBar();
						e.stopPropagation();
					});
				}

				/* set up new show */
				if ( ! isAllShow( title ) ) {
					title_el.parent().addClass( "hrtu_release_page_highlight_new" );
					if ( ! title_el.find( '.hrtu_release_page_toggle_new' ).length ) {
						title_el.append( '<div class="hrtu_release_page_toggle_new"></div>' );
						title_el.on( "click", ".hrtu_release_page_toggle_new", function(e){
							var title = jQuery(this).parent().text();
							addShow( title );
							releasePage();
							sideBar();
							e.stopPropagation();
						});
					}
				}
				else
					title_el.parent().removeClass( "hrtu_release_page_highlight_new" );
			});
			el.find( '.schedule-time' ).each(function(){
				var show;
				var time_el = jQuery(this);
				if ( ! time_el.length ) {
					console.warn( "Horriblesubs Release Time Until releasePage(): No .schedule-time found" );
					return false;
				}
				var time_text;
				if ( entry_day == 'tbd' || time_el.attr( 'title' ) === "" ) {
					show = {
						time: "00:00",
						text: "",
						direction: 1
					};
				}
				else {
					if ( time_el[0].hasAttribute( 'data-hrtu-time' ) )
						time_text = time_el.attr( 'title' );
					else
						time_text = time_el.text();
					
					time_el.title = time_text;
					var match = parseTime( time_text );
					if ( ! match )
						console.warn( "Horriblesubs Release Time Until releasePage(): Unable to parse release time ["+ time_text +"]" );
					show = timeAgo( match.hours, match.minutes, entry_day );
				}
				time_el
					.attr( 'title', time_text )
					.attr( 'data-hrtu-time', show.time )
					.text( show.text )
					.addClass( 'hrtu_time' )
					.parent()
						.addClass( 'hrtu_series_name' );
				if ( show.direction < 0 )
					time_el.addClass( 'hrtu_release_page_time_passed' );

				if ( time_el.parent().hasClass( "hrtu_release_page_highlight" ) ) {
					var text_el = time_el.parent().find( ".schedule-page-show a" );
					var href;
					if ( ! text_el.length ) {
						text_el = time_el.parent().find( ".schedule-show" );
						href = "";
					}
					else {
						href = time_el.attr( 'href' );
					}

					hrtuSidebarAddShow( text_el.text(), show.time, show.text, href );
				}
			});
		}
	});
}

function hrtuSidebarAddShow( title, otime, time_text, href ) {
	if ( ! jQuery( '#hrtu_sidebar' ).length ) {
		jQuery( '#sidebar .xoxo' ).first().append(
			'<li id="hrtu_sidebar" class="widget-container widget_text">' +
			'	<h3 class="widget-title">My Shows</h3>' +
			'	<div class="textwidget">' +
			'		<div class="schedule-today hrtu_sidebar">' +
			'			<table class="schedule-table" border="0" cellpadding="0" cellspacing="0">' +
			'				<tbody></tbody>' +
			'			</table>' +
			'		</div>' +
			'	</div>' +
			'</li>'
		);
	}

	var exists = false;
	jQuery( '#hrtu_sidebar .textwidget .schedule-table tbody td.hrtu_sidebar_show_name' ).each(function(){
		if ( jQuery(this).find( 'a' ).text() == title ) {
			exists = true;
			return false;
		}
	});
	if ( exists === false ) {
		var title_text = 'See all releases for this show';
		if ( ! href ) {
			href = '';
			title_text = '';
		}
		var color_class = ( /ago/.test( time_text ) ) ? "hrtu_release_page_time_passed" : "" ;
		jQuery( '#hrtu_sidebar .textwidget .schedule-table tbody' ).append(
			'<tr>' +
			'	<td class="schedule-widget-show hrtu_sidebar_show_name">' +
			'		<a title="'+ title_text +'" href="'+ href +'">'+ title +'</a>' +
			'	</td>' +
			'	<td title="'+ otime +'" class="schedule-time hrtu_time '+ color_class +'">'+ time_text +'</td>' +
			'</tr>'
		);
	}
}

function hrtuSidebarRemoveShow( title ) {
	jQuery( '#hrtu_sidebar .textwidget .schedule-table tbody td.hrtu_sidebar_show_name' ).each(function(){
		if ( jQuery(this).find( 'a' ).text() == title ) {
			jQuery( this ).parent().remove();
			return false;
		}
	});
}

function addStyles() {
	jQuery( 'body' ).addClass( "hrtu" );
	jQuery( 'head' ).append(
		'<style type="text/css">' +
		'	.hrtu .hrtu_series_name {' +
		'		padding: 0px 6px;' +
		'	}' +
		'	.hrtu .hrtu_series_name:hover {' +
		'		background-color: rgb( 230,230,230 );' +
		'	}' +
		'	.hrtu .hrtu_sidebar_show_name {' +
		'		width: 60%;' +
		'	}' +
		'	.hrtu .hrtu_sidebar_highlight {' +
		'		color: rgb( 0,0,0 );' +
		'		font-weight: bold;' +
		'	}' +
		'	.hrtu .hrtu_sidebar_highlight_new {' +
		'		color: rgb( 0,0,0 );' +
		'	}' +
		'	.hrtu .hrtu_release_page_time_passed {' +
		'		color: rgb( 179,179,179 );' +
		'	}' +
		'	.hrtu .hrtu_sidebar_highlight .hrtu_release_page_time_passed {' +
		'		color: rgb( 129,129,129 );' +
		'	}' +
		'	.hrtu .hrtu_sidebar_highlight_new .hrtu_sidebar_show_name:before {' +
		'		content: "[NEW]";' +
		'		font-size: 12px;' +
		'		font-weight: bold;' +
		'		font-family: sans-serif;' +
		'		color: rgb( 220,0,0 );' +
		'		margin-right: 5px;' +
		'		cursor: pointer;' +
		'	}' +
		'	.hrtu .hrtu_release_page_highlight {' +
		'		font-weight: bold;' +
		'	}' +
		'	.hrtu .hrtu_release_page_highlight .schedule-page-show {' +
		'		position: relative;' +
		'		padding-left: 16px;' +
		'	}' +
		'	.hrtu .hrtu_release_page_highlight .schedule-page-show:before {' +
		'		content: "✓";' +
		'		position: absolute;' +
		'		top: 0px;' +
		'		left: 0px;' +
		'		color: rgb( 0,200,0 );' +
		'	}' +
		'	.hrtu .hrtu_release_page_highlight .hrtu_release_page_time_passed {' +
		'		color: rgb( 144,144,144 );' +
		'	}' +
		'	.hrtu .hrtu_time {' +
		'		white-space: nowrap;' +
		'	}' +
		'	.hrtu .hrtu_release_page_toggle {' +
		'		width: 24px;' +
		'		height: 24px;' +
		'		text-align: center;' +
		'		line-height: 24px;' +
		'		cursor: pointer;' +
		'		display: inline-block;' +
		'		margin-left: 7px;' +
		'	}' +
		'	.hrtu .hrtu_release_page_toggle_new {' +
		'		display: none;' +
		'		text-align: center;' +
		'		line-height: 24px;' +
		'		cursor: pointer;' +
		'		display: inline-block;' +
		'		margin-left: 7px;' +
		'		color: rgb( 220,0,0 );' +
		'	}' +
		'	.hrtu .hrtu_release_page_highlight_new .hrtu_release_page_toggle_new {' +
		'		display: inline-block' +
		'	}' +
		'	.hrtu .hrtu_release_page_toggle:before {' +
		'		content: "[+]";' +
		'	}' +
		'	.hrtu .hrtu_release_page_highlight .hrtu_release_page_toggle:before {' +
		'		content: "[-]";' +
		'	}' +
		'	.hrtu .hrtu_release_page_highlight_new .hrtu_release_page_toggle_new:before {' +
		'		content: "[NEW]";' +
		'		font-weight: bold;' +
		'	}' +
		'	#hrtu_unmark_all_new {' +
		'		height: 22px;' +
		'		border: 1px solid rgb( 200,200,200 );' +
		'		cursor: pointer;' +
		'		color: rgb( 0,102,204 );' +
		'		border-radius: 25px;' +
		'		padding: 0px 8px 2px;' +
		'		box-shadow: 0px 0px 5px rgba( 0,0,0, 0.1 );' +
		'	}' +
		'	#hrtu_unmark_all_new:hover {' +
		'		border-color: rgb( 120,120,120 );' +
		'	}' +
		'	.hrtu_show_outbound_links {' +
		'		padding: 0px 8px 2px;' +
		'		display: inline-block;' +
		'		margin-top: 14px;' +
		'		floaT: right;' +
		'	}' +
		'	.hrtu_show_outbound_link {' +
		'		display: inline-block;' +
		'		color: rgb( 170,175,191 );' +
		'		border-right: 1px solid rgb( 220,220,220 );' +
		'		font-style: italic;' +
		'		padding: 0px 7px 0px 3px;' +
		'	}' +
		'	.hrtu_show_outbound_link:last-child {' +
		'		border: 0px;' +
		'	}' +
		'	#hrtu_alert {' +
		'		position: fixed;' +
		'		top: 0px;' +
		'		left: 0px;' +
		'		background: rgb( 255,0,0 );' +
		'		padding: 10px;' +
		'		color: rgb( 255,255,255 );' +
		'		width: calc( 100% - 20px );' +
		'		text-align: center;' +
		'		font-size: 15px;' +
		'	}' +
		'	#hrtu_alert a {' +
		'		color: rgb( 255,255,255 );' +
		'	}' +
		'	#hrtu_alert .close {' +
		'		float: right;' +
		'		border: 1px solid rgb( 255,255,255 );' +
		'		border-radius: 10px;' +
		'		padding: 0px 6px 4px;' +
		'		line-height: 14px;' +
		'		cursor: pointer' +
		'	}' +
		'</style>'
	);
}

function allShowsPage() {
	console.log( "allShowsPage ["+ jQuery( ".ind-show" ).length +"]" )

	if ( ! jQuery( ".entry-content" ).hasClass( "hrtu_instruction" ) ) {

		jQuery( ".entry-content" )
			.addClass( "hrtu_instruction" )
			.prepend(
				'<ul>' +
				'	<li class="hrtu_instructions">Click [+] or [-] on shows you\'re watching to highlight them</li>' +
				'	<li class="hrtu_instructions">Shows with [NEW] are newly listed, click on [NEW] to unmark individual shows or <span id="hrtu_unmark_all_new">click&nbsp;here</span> to unmark all of them at once.</li>' +
				'</ul>'
			);

		jQuery( '#hrtu_unmark_all_new' ).click(function(){
			jQuery( '.ind-show.linkful' ).each(function(){
				var title_el = jQuery(this);
				var anchor_el = title_el.find( "a" ).first();
				var title = fixTitle( anchor_el.text() );
				var link = linkIdentifier( anchor_el.attr( "href" ) );
				addShow( title, link );
				title_el.removeClass( "hrtu_release_page_highlight_new" );
				sideBar();
			});
		});

	}

	jQuery( ".ind-show.linkful" ).each(function(){
		var title_el = jQuery(this);
		var anchor_el = title_el.find( "a" ).first();
		var title = fixTitle( anchor_el.text() );
		var link = linkIdentifier( anchor_el.attr( "href" ) );
		anchor_el.text( title );

		if ( isUserShow( title, link ) )
			title_el.addClass( "hrtu_release_page_highlight" );
		else
			title_el.removeClass( "hrtu_release_page_highlight" );
		if ( ! anchor_el.find( '.hrtu_release_page_toggle' ).length ) {
			anchor_el.append( '<div class="hrtu_release_page_toggle"></div>' );
			anchor_el.on( "click", ".hrtu_release_page_toggle", function(e){
				e.stopImmediatePropagation();
				e.preventDefault();
				var is_saved = jQuery(this).parent().parent().hasClass( "hrtu_release_page_highlight" );
				if ( is_saved ) {
					removeUserShow( title, link );
					hrtuSidebarRemoveShow( title );
					jQuery(this).parent().parent().removeClass( "hrtu_release_page_highlight" );
				}
				else {
					addUserShow( title, link );
					jQuery(this).parent().parent().addClass( "hrtu_release_page_highlight" );
				}
				sideBar();
			});
		}

		/* set up new show */
		if ( ! isAllShow( title, link ) ) {
			title_el.addClass( "hrtu_release_page_highlight_new" );
			if ( ! anchor_el.find( '.hrtu_release_page_toggle_new' ).length ) {
				anchor_el.append( '<div class="hrtu_release_page_toggle_new"></div>' );
				anchor_el.on( "click", ".hrtu_release_page_toggle_new", function(e){
					e.stopImmediatePropagation();
					e.preventDefault();
					addShow( title, link );
					jQuery(this).parent().parent().removeClass( "hrtu_release_page_highlight_new" );
					sideBar();
				});
			}
		}
		else
			title_el.removeClass( "hrtu_release_page_highlight_new" );
	});
	
}

function showPage() {

	jQuery( "article" ).each(function(){
		var el = jQuery(this);
		var title = encodeURIComponent( el.find( "> header .entry-title" ).text() );
		var info_el = el.find( ".series-info" );
		if ( ! info_el.find( ".hrtu_show_outbound_links" ).length ) {
			info_el.append(
				'<div class="hrtu_show_outbound_links">' +
				'	<a class="hrtu_show_outbound_link"href="http://anidb.net/perl-bin/animedb.pl?adb.search='+ title +'&show=animelist&do.search=search">aniDB</a>' +
				'	<a class="hrtu_show_outbound_link" href="http://www.anime-planet.com/anime/all?name='+ title +'">Anime-Planet</a>' +
				'	<a class="hrtu_show_outbound_link" href="http://myanimelist.net/anime.php?q='+ title +'">MAL</a>' +
				'	<a class="hrtu_show_outbound_link" href="https://hummingbird.me/search?query='+ title +'">Hummingbird</a>' +
				'</div>'
			);
		}
	});
	
}

function splashPage() {

	waitForElement( ".episodecontainer .latest .release-info", function( element ){

		element.each(function(){
			var el = jQuery(this).find( "tr" );
			var link_el = el.find( "td.rls-label a" );
			if ( ! link_el.length )
				return true;
			var link = linkIdentifier( link_el.attr( "href" ) );
			if ( isUserShow( null, link ) )
				el.addClass( "hrtu_release_page_highlight" );
		});

	});

}

function showAlert( message ) {

	jQuery( "body" ).append( '<div id="hrtu_alert">'+ message +'</div>' );
	jQuery( "#hrtu_alert .close" ).click(function(){
		jQuery(this).parent().slideUp();
	});
	
}

function waitForElement( identifier, callback ) {
	var found = false;
	var give_up = 400;
	var interval = setInterval(function(){
		var el = jQuery( identifier );
		if ( el.length ) {
			clearInterval( interval );
			callback( el );
		}
		else if ( --give_up < 0 ) {
			clearInterval( interval );
			callback( false );
		}
	}, 300 );
}


/* Userscript Logic */

updateVersion();

addStyles();
sideBar();
if ( window.location.pathname == '/' )
	splashPage();
else if ( window.location.pathname == '/release-schedule/' )
	releasePage();
else if ( /\/shows\/./.test( window.location.pathname ) )
	showPage();
else if ( /\/(shows|current-season)\/?$/.test( window.location.pathname ) )
	allShowsPage();

setInterval( function(){
	sideBar();
	if ( window.location.pathname == '/release-schedule/' )
		releasePage();
}, 30000 );