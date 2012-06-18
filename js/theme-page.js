// Options JavaScript

jQuery( document ).ready( function( $ ) { "use strict"
	var collection = []
	  , context = "#less_area"
	  , theme = _SnS_options.theme ? _SnS_options.theme: 'default'
	  , timeout = _SnS_options.timeout || 1000
	  , loaded = false
	  , preview = false
	  , compiled
	  , $codemirror, $error, $status, $form, $css
	  , onChange
	  , errorMarker, errorText, errorMirror
	  , config;
	
	// Prevent keystoke compile buildup
	onChange = function onChange( cm ){
		$status.show();
		cm.save();
		if ( timeout ) {
			clearTimeout( _SnS_options.theme_compiler_timer );
			_SnS_options.theme_compiler_timer = setTimeout( _SnS_options.theme_compiler, timeout );
		} else {
			compile();
		}
	}
	config = {
		lineNumbers: true,
		mode: "text/x-less",
		theme: theme,
		indentWithTabs: true,
		onChange: onChange
	};
	
	CodeMirror.commands.save = function() {
		$form.submit();
	}; 
	
	// Each "IDE"
	$( ".sns-less-ide", context ).each( function() {
		var $text = $('.code',this);
		var ide = {
			name : $text.data('file-name'),
			raw : $text.data('raw'),
			data : $text.val(),
			$text : $text,
			lines : 0,
			startLine : 0,
			endLine : 0,
			errorLine : null,
			errorText : null,
			cm : CodeMirror.fromTextArea( $text.get(0), config )
		};
		if ( $text.parent().hasClass( 'sns-collapsed' ) )
			ide.cm.toTextArea();
		collection.push( ide );
	});
	
	// Collapsable
	$( context ).on( "click", '.sns-collapsed-btn, .sns-collapsed-btn + label', function( event ){
		var $this = $( this )
		  , collapsed
		  , fileName
		  , thisIDE;
		$this.parent().toggleClass( 'sns-collapsed' );
		fileName = $this.siblings( '.code' ).data( 'file-name' );
		collapsed = $this.parent().hasClass( 'sns-collapsed' );
		$(collection).each(function(index, element) {
			if ( element.name == fileName )
				thisIDE = element;
		});
		if ( collapsed ) {
			thisIDE.cm.toTextArea();
		} else {
			thisIDE.cm = CodeMirror.fromTextArea( thisIDE.$text.get(0), config );
		}
		$.post( ajaxurl,
			{   action: 'sns_open_theme_panels'
			  , _ajax_nonce: $( '#_wpnonce' ).val()
			  , 'file-name':  fileName
			  , 'collapsed':  collapsed ? 'yes' : 'no'
			}
		);
	});
	$( '#css_area' ).on( "click", '.sns-collapsed-btn, .sns-collapsed-btn + label', function( event ){
		var $this = $( this ).parent();
		$this.toggleClass( 'sns-collapsed' );
		preview = ! $this.hasClass( 'sns-collapsed' );
		if ( preview )
			compiled = createCSSEditor();
		else
			compiled.toTextArea();
	});
	
	$( '.single-status' ).hide();
	$( '.sns-ajax-loading' ).hide();
	
	// Load
	$( context ).on( "click", ".sns-ajax-load", function( event ){
		event.preventDefault();
		$( this ).nextAll( '.sns-ajax-loading' ).show();
		var name = $( this ).parent().prevAll( '.code' ).data( 'file-name' );
		$( collection ).each( function( index, element ){
			if ( element.name == name ) {
				element.cm.setValue( element.raw );
				return;
			}
		});
		compile();
		$( '.sns-ajax-loading' ).hide();
		$( this ).nextAll( '.single-status' )
			.show().delay(3000).fadeOut()
			.children('.settings-error').text( 'Original Source File Loaded.' );
	});
	
	// Save
	$( context ).on( "click", ".sns-ajax-save", function( event ){
		event.preventDefault();
		$( this ).nextAll( '.sns-ajax-loading' ).show();
		$form.submit();
	});
	function saved( data ) {
		$(data).insertAfter( '#icon-sns + h2' ).delay(3000).fadeOut();
		$( '.sns-ajax-loading' ).hide();
	}
	
	// The CSS output side.
	$css = $( '.css', "#css_area" );
	if ( preview ) {
		compiled = createCSSEditor();
	}
	$codemirror = $css.next( '.CodeMirror' );
	$error = $( "#compiled_error" );
	$status = $( "#compile_status" );
	
	// Start.
	compile();
	loaded = true;
	
	$form = $( "#less_area" ).closest( 'form' );
	$form.submit( function( event ){
		event.preventDefault();
		compile();
		$.ajax({  
			type: "POST",  
			url: window.location,  
			data: $(this).serialize()+'&ajaxsubmit=1',
			cache: false,
			success: saved 
		});
	});
	function createCSSEditor() {
		return CodeMirror.fromTextArea(
			$css.get(0),
			{ lineNumbers: true, mode: "css", theme: theme, readOnly: true }
		);
	}
	function compile() {
		var lessValue = '';
		var totalLines = 0;
		var compiledValue;
		$( collection ).each(function(){
			//this.cm.save();
			lessValue += "\n" + this.$text.val();
			this.lines = this.cm.lineCount();
			this.startLine = totalLines;
			totalLines += this.lines;
			this.endLine = totalLines;
		});
		var parser = new( less.Parser );
		parser.parse( lessValue, function ( err, tree ) {
			if ( err ){
				doError( err );
			} else {
				try {
					$error.hide();
					if ( preview ) {
						compiledValue = tree.toCSS();
						compiled.setValue( compiledValue );
						compiled.save();
						//$codemirror.show();
						compiled.refresh();
						clearCompileError();
					} else {
						compiledValue = tree.toCSS({ compress: true });
						$css.val( compiledValue );
						clearCompileError();
					}
				}
				catch ( err ) {
					doError( err );
				}
			}
		});
		clearTimeout( _SnS_options.theme_compiler_timer );
		$status.hide();
	}
	function doError( err ) {
		console.log( err );
		var pos, token, start, end, errLine, fileName, errMessage;
		errLine = err.line-1;
		
		errorMirror = null;
		$( collection ).each(function( i ){
			if ( this.startLine <= errLine && errLine < this.endLine ) {
				errorMirror = this.cm;
				errLine = errLine - this.startLine -1;
				fileName = this.name;
				return;
			}
		});
		
		//$codemirror.hide();
		
		var errMessage = '';
		
		if ( err.type == 'Parse' )
			errMessage = " &nbsp; <em>LESS Parse Error</em> <br /> on line " + ( errLine + 1 ) + " of " + fileName + ".</p>";
		else
			errMessage = " &nbsp; <em>LESS " + err.type +" Error</em> on line " + ( errLine + 1 ) + " of " + fileName + ". <br />" + err.message + "</p>";
		
		if ( loaded ) {
			$error
				.removeClass( 'error' )
				.addClass( 'updated' )
				.show()
				.html( "<p><strong>Warning:</strong>" + errMessage + "</p>" );
		} else {
			$error
				.show()
				.html( "<p><strong>Error: &nbsp; </strong>" + errMessage + "</p>" );
		}
		
		clearCompileError();
		
		if (!errorMirror) return;
		
		errorMarker = errorMirror.setMarker( errLine, '<strong>*%N%</strong>', "cm-error" );
		
		errorMirror.setLineClass( errorMarker, "cm-error" );
		
		pos = errorMirror.posFromIndex( err.index + 1 );
		token = errorMirror.getTokenAt( pos );
		start = errorMirror.posFromIndex( err.index );
		end = errorMirror.posFromIndex( err.index + token.string.length );
		
		errorText = errorMirror.markText( start, end, "cm-error" );
		if ( preview ) {
			compiled.setValue( "" );
			compiled.save();
			compiled.refresh();
		}
	}
	function clearCompileError() {
		if ( errorMarker ) {
			errorMirror.clearMarker( errorMarker );
			errorMirror.setLineClass( errorMarker, null );
			errorMarker = false;
		}
		if ( errorText ) errorText.clear();
		errorText = false;
	}
	_SnS_options.theme_compiler = compile;
});