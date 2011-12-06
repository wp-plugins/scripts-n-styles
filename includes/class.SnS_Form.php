<?php
/**
 * SnS_Global_Page
 * 
 * Allows WordPress admin users the ability to add custom CSS
 * and JavaScript directly to individual Post, Pages or custom
 * post types.
 */
		
class SnS_Form
{
    /**
	 * Settings Page
	 * Outputs a textarea for setting 'scripts_in_head'.
     */
	function textarea( $args ) {
		extract( $args );
		$options = get_option( $setting );
		$value =  isset( $options[ $label_for ] ) ? $options[ $label_for ] : '';
		$output = '<textarea';
		$output .= ( $style ) ? ' style="' . $style . '"': '';
		$output .= ( $class ) ? ' class="' . $class . '"': '';
		$output .= ( $rows ) ? ' rows="' . $rows . '"': '';
		$output .= ( $cols ) ? ' cols="' . $cols . '"': '';
		$output .= ' name="' . $setting . '[' . $label_for . ']"';
		$output .= ' id="' . $label_for . '">';
		$output .= $value . '</textarea>';
		if ( $description ) {
			$output .= $description;
		}
		echo $output;
	}
	
    /**
	 * Settings Page
	 * Outputs a select element for selecting options to set scripts for including.
     */
	function select( $args ) {
		extract( $args );
		$options = get_option( $setting );
		$selected = isset( $options[ $label_for ] ) ? $options[ $label_for ] : array();
		
		$output = '<select';
		$output .= ' id="' . $label_for . '"';
		$output .= ' name="' . $setting . '[' . $label_for . ']';
		if ( isset( $multiple ) && $multiple )
			$output .= '[]" multiple="multiple"';
		else
			$output .= '"';
		$output .= ( $size ) ? ' size="' . $size . '"': '';
		$output .= ( $style ) ? ' style="' . $style . '"': '';
		$output .= '>';
		foreach ( $choices as $choice ) {
			$output .= '<option value="' . $choice . '"';
			if ( isset( $multiple ) && $multiple )
				foreach ( $selected as $handle ) $output .= selected( $handle, $choice, false );
			else
				$output .= selected( $selected, $choice, false );
			$output .= '>' . $choice . '</option> ';
		}
		$output .= '</select>';
		if ( ! empty( $show_current ) && ! empty( $selected ) ) {
			$output .= '<p>' . $show_current;
			foreach ( $selected as $handle ) $output .= '<code>' . $handle . '</code> ';
			$output .= '</p>';
		}
		echo $output;
	}
	
    /**
	 * Settings Page
	 * Outputs the Admin Page and calls the Settings registered with the Settings API.
     */
	function take_action() {
		global $action, $option_page, $page, $new_whitelist_options;
		
		if ( ! current_user_can( 'manage_options' ) || ! current_user_can( 'unfiltered_html' ) || ( is_multisite() && ! is_super_admin() ) )
			wp_die( __( 'Cheatin&#8217; uh?' ) );
		
		if ( isset( $_REQUEST[ 'message' ] ) && $_REQUEST[ 'message' ] )
			add_settings_error( $page, 'settings_updated', __( 'Settings saved.' ), 'updated' );
		
		if ( ! isset( $_REQUEST[ 'action' ], $_REQUEST[ 'option_page' ], $_REQUEST[ 'page' ] ) )
			return;
		
		wp_reset_vars( array( 'action', 'option_page', 'page' ) );
		
		check_admin_referer(  $option_page  . '-options' );
		
		if ( ! isset( $new_whitelist_options[ $option_page ] ) )
			return;
		
		$options = $new_whitelist_options[ $option_page ];
		foreach ( (array) $options as $option ) {
			$old = get_option( $option );
			$option = trim( $option );
			$value = null;
			if ( isset($_POST[ $option ]) )
				$value = $_POST[ $option ];
			if ( !is_array( $value ) )
				$value = trim( $value );
			
			$value = array_merge( $old, stripslashes_deep( $value ) );
			update_option( $option, $value );
		}
		
		if ( ! count( get_settings_errors() ) )
			add_settings_error( $page, 'settings_updated', __( 'Settings saved.' ), 'updated' );
		
		if ( isset( $_POST[ $option ][ 'menu_position' ] ) && ( $value[ 'menu_position' ] != SnS_Admin::$parent_slug ) ) {
			switch( $value[ 'menu_position' ] ) {
				case 'menu':
				case 'object':
				case 'utility':
					wp_redirect( add_query_arg( 'message', 1, admin_url( 'admin.php?page=sns_settings' ) ) );
					break;
				default:
					wp_redirect( add_query_arg( 'message', 1, admin_url( $value[ 'menu_position' ].'?page=sns_settings' ) ) );
					break;
			}
		}
		return;
	}

    /**
	 * Settings Page
	 * Outputs the Admin Page and calls the Settings registered with the Settings API in init_options_page().
     */
	function page() {
		SnS_Admin::upgrade_check();
		?>
		<div class="wrap">
			<?php SnS_Admin::nav(); ?>
			<?php settings_errors(); ?>
			<form action="" method="post" autocomplete="off">
			<?php settings_fields( SnS_Admin::OPTION_GROUP ); ?>
			<?php do_settings_sections( SnS_Admin::MENU_SLUG ); ?>
			<?php submit_button(); ?>
			</form>
		</div>
		<?php
	}
}
?>