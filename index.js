'use strict';

/**
 * Bootstrap-select v1.8.0 (http://silviomoreto.github.io/bootstrap-select)
 * Copyright 2013-2015 bootstrap-select
 * Licensed under MIT (https://github.com/silviomoreto/bootstrap-select/blob/master/LICENSE)
 *
 * Select3 v0.1.0 (https://github.com/wearespindle/select3)
 * Licensed under MIT (https://github.com/wearespindle/select3/blob/master/LICENSE.md)
 */


$.fn.triggerNative = function(eventName) {
    var event;
    var el = this[0];
    if (el.dispatchEvent) {
        if (typeof Event === 'function') {
            // For modern browsers
            event = new Event(eventName, {bubbles: true});
        } else {
            // For IE since it doesn't support Event constructor
            event = document.createEvent('Event');
            event.initEvent(eventName, true, false);
        }
        el.dispatchEvent(event);
    } else {
        if (el.fireEvent) {
            event = document.createEventObject();
            event.eventType = eventName;
            el.fireEvent('on' + eventName, event);
        }
        this.trigger(eventName);
    }
};


// Case insensitive contains search.
$.expr[':'].icontains = function(obj, index, meta) {
    var $obj = $(obj);
    var haystack = ($obj.data('tokens') || $obj.text()).toString().toUpperCase();
    return haystack.includes(meta[3].toUpperCase());
};

// Case insensitive begins search.
$.expr[':'].ibegins = function(obj, index, meta) {
    var $obj = $(obj);
    var haystack = ($obj.data('tokens') || $obj.text()).toString().toUpperCase();
    return haystack.startsWith(meta[3].toUpperCase());
};

// Case and accent insensitive contains search.
$.expr[':'].aicontains = function(obj, index, meta) {
    var $obj = $(obj);
    var haystack = ($obj.data('tokens') || $obj.data('normalizedText') || $obj.text()).toString().toUpperCase();
    return haystack.includes(meta[3].toUpperCase());
};

// Case and accent insensitive begins search.
$.expr[':'].aibegins = function(obj, index, meta) {
    var $obj = $(obj);
    var haystack = ($obj.data('tokens') || $obj.data('normalizedText') || $obj.text()).toString().toUpperCase();
    return haystack.startsWith(meta[3].toUpperCase());
};

/**
* Remove all diatrics from the given text.
* @access private
* @param {String} text
* @returns {String}
*/
function normalizeToBase(text) {
    var rExps = [
        {re: /[\xE0-\xE6]/g, ch: 'a'},
        {re: /[\xC0-\xC6]/g, ch: 'A'},
        {re: /[\xC8-\xCB]/g, ch: 'E'},
        {re: /[\xE8-\xEB]/g, ch: 'e'},
        {re: /[\xCC-\xCF]/g, ch: 'I'},
        {re: /[\xEC-\xEF]/g, ch: 'i'},
        {re: /[\xD2-\xD6]/g, ch: 'O'},
        {re: /[\xF2-\xF6]/g, ch: 'o'},
        {re: /[\xD9-\xDC]/g, ch: 'U'},
        {re: /[\xF9-\xFC]/g, ch: 'u'},
        {re: /[\xC7-\xE7]/g, ch: 'c'},
        {re: /[\xD1]/g, ch: 'N'},
        {re: /[\xF1]/g, ch: 'n'},
    ];
    $.each(rExps, function() {
        text = text.replace(this.re, this.ch);
    });
    return text;
}


function htmlEscape(html) {
    var escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '`': '&#x60;',
    };
    var source = '(?:' + Object.keys(escapeMap).join('|') + ')';
    var testRegexp = new RegExp(source);
    var replaceRegexp = new RegExp(source, 'g');
    var string = html === null ? '' : '' + html;
    return testRegexp.test(string) ? string.replace(replaceRegexp, function(match) {
        return escapeMap[match];
    }) : string;
}


class Select3 {

    constructor(element, options, e) {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }

        this.$element = $(element);
        this.$newElement = null;
        this.$button = null;
        this.$menu = null;
        this.$lis = null;
        this.options = options;

        // If we have no title yet, try to pull it from the html title attribute (jQuery doesnt' pick it up as it's not a
        // data-attribute)
        if (this.options.title === null) {
            this.options.title = this.$element.attr('title');
        }

        //Expose public methods
        this.val = Select3.prototype.val;
        this.render = Select3.prototype.render;
        this.refresh = Select3.prototype.refresh;
        this.setStyle = Select3.prototype.setStyle;
        this.selectAll = Select3.prototype.selectAll;
        this.deselectAll = Select3.prototype.deselectAll;
        this.destroy = Select3.prototype.destroy;
        this.remove = Select3.prototype.remove;
        this.show = Select3.prototype.show;
        this.hide = Select3.prototype.hide;

        this.init();
    }


    init() {
        var that = this;
        var id = this.$element.attr('id');
        this.$element.addClass('bs-select-hidden');

        // store originalIndex (key) and newIndex (value) in this.liObj for fast accessibility
        // allows us to do this.$lis.eq(that.liObj[index]) instead of this.$lis.filter('[data-original-index="' + index + '"]')
        this.liObj = {};
        this.multiple = this.$element.prop('multiple');
        this.autofocus = this.$element.prop('autofocus');
        this.$newElement = this.createView();
        this.$element
        .after(this.$newElement)
        .appendTo(this.$newElement);
        this.$button = this.$newElement.children('button');
        this.$menu = this.$newElement.children('.dropdown-menu');
        this.$menuInner = this.$menu.children('.inner');
        this.$searchbox = this.$menu.find('input');

        this.$element.removeClass('bs-select-hidden');

        if (this.options.dropdownAlignRight === true) this.$menu.addClass('dropdown-menu-right');

        if (typeof id !== 'undefined') {
            this.$button.attr('data-id', id);
            $('label[for="' + id + '"]').click(function(e) {
                e.preventDefault();
                that.$button.focus();
            });
        }

        this.checkDisabled();
        this.clickListener();

        if (this.options.liveSearch) this.liveSearchListener();

        this.render();
        this.setStyle();
        this.setWidth();

        if (this.options.container) this.selectPosition();

        this.$menu.data('this', this);
        this.$newElement.data('this', this);

        if (this.options.mobile) this.mobile();

        this.$newElement.on({
            'hide.bs.dropdown': function(e) {
                that.$element.trigger('hide.bs.select', e);
            },
            'hidden.bs.dropdown': function(e) {
                that.$element.trigger('hidden.bs.select', e);
            },
            'show.bs.dropdown': function(e) {
                that.$element.trigger('show.bs.select', e);
            },
            'shown.bs.dropdown': function(e) {
                that.$element.trigger('shown.bs.select', e);
            },
        });

        if (that.$element[0].hasAttribute('required')) {
            this.$element.on('invalid', function() {
                that.$button.addClass('bs-invalid').focus();
                that.$element.on({
                    'focus.bs.select': function() {
                        that.$button.focus();
                        that.$element.off('focus.bs.select');
                    },
                    'shown.bs.select': function() {
                        that.$element
                        .val(that.$element.val()) // set the value to hide the validation message in Chrome when menu is opened
                        .off('shown.bs.select');
                    },
                    'rendered.bs.select': function() {
                        // if select is no longer invalid, remove the bs-invalid class
                        if (this.validity.valid) that.$button.removeClass('bs-invalid');
                        that.$element.off('rendered.bs.select');
                    },
                });
            });
        }

        setTimeout(function() {
            that.$element.trigger('loaded.bs.select');
        });
    }


    createDropdown() {
        // Options
        // If we are multiple or showTick option is set, then add the show-tick class
        var showTick = (this.multiple || this.options.showTick) ? ' show-tick' : '';
        var inputGroup = this.$element.parent().hasClass('input-group') ? ' input-group-btn' : '';
        var autofocus = this.autofocus ? ' autofocus' : '';
        // Elements
        var header = this.options.header ? '<div class="popover-title"><button type="button" class="close" aria-hidden="true">&times;</button>' + this.options.header + '</div>' : '';
        var searchbox = this.options.liveSearch ?
            '<div class="bs-searchbox">' +
            '<input type="text" class="form-control" autocomplete="off"' +
            (this.options.liveSearchPlaceholder === null ? '' : ' placeholder="' + htmlEscape(this.options.liveSearchPlaceholder) + '"') + '>' +
            '</div>' : '';
        var actionsbox = this.multiple && this.options.actionsBox ?
            '<div class="bs-actionsbox">' +
            '<div class="btn-group btn-group-sm btn-block">' +
            '<button type="button" class="actions-btn bs-select-all btn btn-default">' +
            this.options.selectAllText +
            '</button>' +
            '<button type="button" class="actions-btn bs-deselect-all btn btn-default">' +
            this.options.deselectAllText +
            '</button>' +
            '</div>' +
            '</div>' : '';
        var donebutton = this.multiple && this.options.doneButton ?
            '<div class="bs-donebutton">' +
            '<div class="btn-group btn-block">' +
            '<button type="button" class="btn btn-sm btn-default">' +
            this.options.doneButtonText +
            '</button>' +
            '</div>' +
            '</div>' : '';
        var drop = '<div class="btn-group bootstrap-select' + showTick + inputGroup + '">' +
            '<button type="button" class="' + this.options.styleBase + ' dropdown-toggle" data-toggle="dropdown"' + autofocus + '>' +
            '<span class="filter-option pull-left"></span>&nbsp;' +
            '<span class="bs-caret">' +
            this.options.template.caret +
            '</span>' +
            '</button>' +
            '<div class="dropdown-menu open">' +
            header +
            searchbox +
            actionsbox +
            '<ul class="dropdown-menu inner" role="menu">' +
            '</ul>' +
            donebutton +
            '</div>' +
            '</div>';

        return $(drop);
    }


    createView() {
        var $drop = this.createDropdown();
        var li = this.createLi();

        $drop.find('ul')[0].innerHTML = li;
        return $drop;
    }


    reloadLi() {
        var li;
        //Remove all children.
        this.destroyLi();
        //Re build
        li = this.createLi();
        this.$menuInner[0].innerHTML = li;
    }


    destroyLi() {
        this.$menu.find('li').remove();
    }


    createLi() {
        var that = this;
        var _li = [];
        var optID = 0;
        var titleOption = document.createElement('option');
        // increment liIndex whenever a new <li> element is created to ensure liObj is correct
        var liIndex = -1;

        // Helper functions
        /**
        * @param content
        * @param [index]
        * @param [classes]
        * @param [optgroup]
        * @returns {string}
        */
        var generateLI = function(content, index, classes, optgroup) {
            return '<li' +
            ((typeof classes !== 'undefined' & classes !== '') ? ' class="' + classes + '"' : '') +
            ((typeof index !== 'undefined' & index !== null) ? ' data-original-index="' + index + '"' : '') +
            ((typeof optgroup !== 'undefined' & optgroup !== null) ? 'data-optgroup="' + optgroup + '"' : '') +
            '>' + content + '</li>';
        };

        /**
        * @param text
        * @param [classes]
        * @param [inline]
        * @param [tokens]
        * @returns {string}
        */
        var generateA = function(text, classes, inline, tokens) {
            return '<a tabindex="0"' +
            (typeof classes !== 'undefined' ? ' class="' + classes + '"' : '') +
            (typeof inline !== 'undefined' ? ' style="' + inline + '"' : '') +
            (that.options.liveSearchNormalize ? ' data-normalized-text="' + normalizeToBase(htmlEscape(text)) + '"' : '') +
            (typeof tokens !== 'undefined' || tokens !== null ? ' data-tokens="' + tokens + '"' : '') +
            '>' + text +
            '<span class="' + that.options.iconBase + ' ' + that.options.tickIcon + ' check-mark"></span>' +
            '</a>';
        };

        if (this.options.title && !this.multiple) {
            // this option doesn't create a new <li> element, but does add a new option, so liIndex is decreased
            // since liObj is recalculated on every refresh, liIndex needs to be decreased even if the titleOption is already appended
            liIndex--;

            if (!this.$element.find('.bs-title-option').length) {
                // Use native JS to prepend option (faster)
                let element = this.$element[0];
                titleOption.className = 'bs-title-option';
                titleOption.appendChild(document.createTextNode(this.options.title));
                titleOption.value = '';
                element.insertBefore(titleOption, element.firstChild);
                // Check if selected attribute is already set on an option. If not, select the titleOption option.
                // attr gets the 'default' selected option (from markup), prop gets the 'current' selected option
                // the selected item may have been changed by user or programmatically before the bootstrap select plugin runs
                let $opt = $(element.options[element.selectedIndex]);
                if ($opt.attr('selected') === undefined && $opt.prop('selected') === false) {
                    titleOption.selected = true;
                }
            }
        }

        this.$element.find('option').each(function(index) {
            var $this = $(this);
            liIndex++;

            if ($this.hasClass('bs-title-option')) return;

            // Get the class and text for the option
            let optionClass = this.className || '';
            let inline = this.style.cssText;
            let text = $this.data('content') ? $this.data('content') : $this.html();
            let tokens = $this.data('tokens') ? $this.data('tokens') : null;
            let subtext = typeof $this.data('subtext') !== 'undefined' ? '<small class="text-muted">' + $this.data('subtext') + '</small>' : '';
            let icon = typeof $this.data('icon') !== 'undefined' ? '<span class="' + that.options.iconBase + ' ' + $this.data('icon') + '"></span> ' : '';
            let $parent = $this.parent();
            let isOptgroup = $parent[0].tagName === 'OPTGROUP';
            let isOptgroupDisabled = isOptgroup && $parent[0].disabled;
            let isDisabled = this.disabled || isOptgroupDisabled;

            if (icon !== '' && isDisabled) {
                icon = '<span>' + icon + '</span>';
            }

            if (that.options.hideDisabled && (isDisabled && !isOptgroup || isOptgroupDisabled)) {
                liIndex--;
                return;
            }

            if (!$this.data('content')) {
                // Prepend any icon and append any subtext to the main text.
                text = icon + '<span class="text">' + text + subtext + '</span>';
            }

            if (isOptgroup && $this.data('divider') !== true) {
                if (that.options.hideDisabled && isDisabled) {
                    if ($parent.data('allOptionsDisabled') === undefined) {
                        let $options = $parent.children();
                        $parent.data('allOptionsDisabled', $options.filter(':disabled').length === $options.length);
                    }

                    if ($parent.data('allOptionsDisabled')) {
                        liIndex--;
                        return;
                    }
                }

                let optGroupClass = ' ' + $parent[0].className || '';

                if ($this.index() === 0) { // Is it the first option of the optgroup?
                    optID += 1;

                    // Get the opt group label
                    let label = $parent[0].label;
                    let labelSubtext = typeof $parent.data('subtext') !== 'undefined' ? '<small class="text-muted">' + $parent.data('subtext') + '</small>' : '';
                    let labelIcon = $parent.data('icon') ? '<span class="' + that.options.iconBase + ' ' + $parent.data('icon') + '"></span> ' : '';

                    label = labelIcon + '<span class="text">' + label + labelSubtext + '</span>';
                    // Is it NOT the first option of the select && are there elements in the dropdown?
                    if (index !== 0 && _li.length > 0) {
                        liIndex++;
                        _li.push(generateLI('', null, 'divider', optID + 'div'));
                    }
                    liIndex++;
                    _li.push(generateLI(label, null, 'dropdown-header' + optGroupClass, optID));
                }

                if (that.options.hideDisabled && isDisabled) {
                    liIndex--;
                    return;
                }

                _li.push(generateLI(generateA(text, 'opt ' + optionClass + optGroupClass, inline, tokens), index, '', optID));
            } else if ($this.data('divider') === true) {
                _li.push(generateLI('', index, 'divider'));
            } else if ($this.data('hidden') === true) {
                _li.push(generateLI(generateA(text, optionClass, inline, tokens), index, 'hidden is-hidden'));
            } else {
                let showDivider = this.previousElementSibling && this.previousElementSibling.tagName === 'OPTGROUP';

                // if previous element is not an optgroup and hideDisabled is true
                if (!showDivider && that.options.hideDisabled) {
                    // get previous elements
                    let $prev = $(this).prevAll();
                    for (let i = 0; i < $prev.length; i++) {
                        // find the first element in the previous elements that is an optgroup
                        if ($prev[i].tagName === 'OPTGROUP') {
                            let optGroupDistance = 0;
                            // loop through the options in between the current option and the optgroup
                            // and check if they are hidden or disabled
                            for (let d = 0; d < i; d++) {
                                let prevOption = $prev[d];
                                if (prevOption.disabled || $(prevOption).data('hidden') === true) optGroupDistance++;
                            }

                            // if all of the options between the current option and the optgroup are hidden or disabled, show the divider
                            if (optGroupDistance === i) showDivider = true;

                            break;
                        }
                    }
                }

                if (showDivider) {
                    liIndex++;
                    _li.push(generateLI('', null, 'divider', optID + 'div'));
                }
                _li.push(generateLI(generateA(text, optionClass, inline, tokens), index));
            }

            that.liObj[index] = liIndex;
        });

        //If we are not multiple, we don't have a selected item, and we don't have a title, select the first element so something is set in the button
        if (!this.multiple && this.$element.find('option:selected').length === 0 && !this.options.title) {
            this.$element.find('option').eq(0).prop('selected', true).attr('selected', 'selected');
        }

        return _li.join('');
    }


    findLis() {
        if (this.$lis === null) this.$lis = this.$menu.find('li');
        return this.$lis;
    }


    /**
    * @param [updateLi] defaults to true
    */
    render(updateLi) {
        let notDisabled;
        let that = this;

        // Update the LI to match the SELECT
        if (updateLi !== false) {
            this.$element.find('option').each(function(index) {
                let $lis = that.findLis().eq(that.liObj[index]);

                that.setDisabled(index, this.disabled || this.parentNode.tagName === 'OPTGROUP' && this.parentNode.disabled, $lis);
                that.setSelected(index, this.selected, $lis);
            });

            this.togglePlaceholder();
        }

        this.tabIndex();

        let selectedItems = this.$element.find('option').map(function() {
            if (this.selected) {
                if (that.options.hideDisabled && (this.disabled || this.parentNode.tagName === 'OPTGROUP' && this.parentNode.disabled)) return null;

                let $this = $(this);
                let icon = $this.data('icon') && that.options.showIcon ? '<i class="' + that.options.iconBase + ' ' + $this.data('icon') + '"></i> ' : '';
                let subtext;

                if (that.options.showSubtext && $this.data('subtext') && !that.multiple) {
                    subtext = ' <small class="text-muted">' + $this.data('subtext') + '</small>';
                } else {
                    subtext = '';
                }
                if (typeof $this.attr('title') !== 'undefined') {
                    return $this.attr('title');
                } else if ($this.data('content') && that.options.showContent) {
                    return $this.data('content');
                }
                return icon + $this.html() + subtext;
            }
            return null;
        }).toArray();

        //Fixes issue in IE10 occurring when no default option is selected and at least one option is disabled
        //Convert all the values into a comma delimited string
        let title = !this.multiple ? selectedItems[0] : selectedItems.join(this.options.multipleSeparator);

        //If this is multi select, and the selectText type is count, the show 1 of 2 selected etc..
        if (this.multiple && this.options.selectedTextFormat.indexOf('count') > -1) {
            let max = this.options.selectedTextFormat.split('>');
            if ((max.length > 1 && selectedItems.length > max[1]) || (max.length === 1 && selectedItems.length >= 2)) {
                notDisabled = this.options.hideDisabled ? ', [disabled]' : '';
                let totalCount = this.$element.find('option').not('[data-divider="true"], [data-hidden="true"]' + notDisabled).length;
                let tr8nText = (typeof this.options.countSelectedText === 'function') ? this.options.countSelectedText(selectedItems.length, totalCount) : this.options.countSelectedText;
                title = tr8nText.replace('{0}', selectedItems.length.toString()).replace('{1}', totalCount.toString());
            }
        }

        if (this.options.title === undefined) {
            this.options.title = this.$element.attr('title');
        }

        if (this.options.selectedTextFormat === 'static') {
            title = this.options.title;
        }

        //If we dont have a title, then use the default, or if nothing is set at all, use the not selected text
        if (!title) {
            title = typeof this.options.title !== 'undefined' ? this.options.title : this.options.noneSelectedText;
        }

        //strip all html-tags and trim the result
        this.$button.attr('title', $.trim(title.replace(/<[^>]*>?/g, '')));
        this.$button.children('.filter-option').html(title);
        this.$element.trigger('rendered.bs.select');
    }


    /**
    * @param [style]
    * @param [status]
    */
    setStyle(style, status) {
        if (this.$element.attr('class')) {
            this.$newElement.addClass(this.$element.attr('class').replace(/selectpicker|mobile-device|bs-select-hidden|validate\[.*\]/gi, ''));
        }

        let buttonClass = style ? style : this.options.style;

        if (status === 'add') {
            this.$button.addClass(buttonClass);
        } else if (status === 'remove') {
            this.$button.removeClass(buttonClass);
        } else {
            this.$button.removeClass(this.options.style);
            this.$button.addClass(buttonClass);
        }
    }


    liHeight(refresh) {
        if (!refresh && (this.options.size === false || this.sizeInfo)) return;

        let newElement = document.createElement('div');
        let menu = document.createElement('div');
        let menuInner = document.createElement('ul');
        let divider = document.createElement('li');
        let li = document.createElement('li');
        let a = document.createElement('a');
        let text = document.createElement('span');
        let header = this.options.header && this.$menu.find('.popover-title').length > 0 ? this.$menu.find('.popover-title')[0].cloneNode(true) : null;
        let search = this.options.liveSearch ? document.createElement('div') : null;
        let actions = this.options.actionsBox && this.multiple && this.$menu.find('.bs-actionsbox').length > 0 ? this.$menu.find('.bs-actionsbox')[0].cloneNode(true) : null;
        let doneButton = this.options.doneButton && this.multiple && this.$menu.find('.bs-donebutton').length > 0 ? this.$menu.find('.bs-donebutton')[0].cloneNode(true) : null;

        text.className = 'text';
        newElement.className = this.$menu[0].parentNode.className + ' open';
        menu.className = 'dropdown-menu open';
        menuInner.className = 'dropdown-menu inner';
        divider.className = 'divider';

        text.appendChild(document.createTextNode('Inner text'));
        a.appendChild(text);
        li.appendChild(a);
        menuInner.appendChild(li);
        menuInner.appendChild(divider);
        if (header) menu.appendChild(header);
        if (search) {
            // create a span instead of input as creating an input element is slower
            let input = document.createElement('span');
            search.className = 'bs-searchbox';
            input.className = 'form-control';
            search.appendChild(input);
            menu.appendChild(search);
        }
        if (actions) menu.appendChild(actions);
        menu.appendChild(menuInner);
        if (doneButton) menu.appendChild(doneButton);
        newElement.appendChild(menu);

        document.body.appendChild(newElement);

        let liHeight = a.offsetHeight;
        let headerHeight = header ? header.offsetHeight : 0;
        let searchHeight = search ? search.offsetHeight : 0;
        let actionsHeight = actions ? actions.offsetHeight : 0;
        let doneButtonHeight = doneButton ? doneButton.offsetHeight : 0;
        let dividerHeight = $(divider).outerHeight(true);
        // fall back to jQuery if getComputedStyle is not supported
        let menuStyle = typeof getComputedStyle === 'function' ? getComputedStyle(menu) : false;
        let $menu = menuStyle ? null : $(menu);
        let menuPadding = {
            vert:
                parseInt(menuStyle ? menuStyle.paddingTop : $menu.css('paddingTop'), 10) +
                parseInt(menuStyle ? menuStyle.paddingBottom : $menu.css('paddingBottom'), 10) +
                parseInt(menuStyle ? menuStyle.borderTopWidth : $menu.css('borderTopWidth'), 10) +
                parseInt(menuStyle ? menuStyle.borderBottomWidth : $menu.css('borderBottomWidth'), 10),
            horiz:
                parseInt(menuStyle ? menuStyle.paddingLeft : $menu.css('paddingLeft'), 10) +
                parseInt(menuStyle ? menuStyle.paddingRight : $menu.css('paddingRight'), 10) +
                parseInt(menuStyle ? menuStyle.borderLeftWidth : $menu.css('borderLeftWidth'), 10) +
                parseInt(menuStyle ? menuStyle.borderRightWidth : $menu.css('borderRightWidth'), 10),
        };
        let menuExtras = {
            vert: menuPadding.vert + parseInt(menuStyle ? menuStyle.marginTop : $menu.css('marginTop'), 10) + parseInt(menuStyle ? menuStyle.marginBottom : $menu.css('marginBottom'), 10) + 2,
            horiz: menuPadding.horiz + parseInt(menuStyle ? menuStyle.marginLeft : $menu.css('marginLeft'), 10) + parseInt(menuStyle ? menuStyle.marginRight : $menu.css('marginRight'), 10) + 2,
        };

        document.body.removeChild(newElement);

        this.sizeInfo = {
            liHeight: liHeight,
            headerHeight: headerHeight,
            searchHeight: searchHeight,
            actionsHeight: actionsHeight,
            doneButtonHeight: doneButtonHeight,
            dividerHeight: dividerHeight,
            menuPadding: menuPadding,
            menuExtras: menuExtras,
        };
    }


    setSize() {
        this.findLis();
        this.liHeight();

        if (this.options.header) this.$menu.css('padding-top', 0);
        if (this.options.size === false) return;

        let menuHeight, menuWidth, getHeight, getWidth, selectOffsetTop, selectOffsetBot, selectOffsetLeft, selectOffsetRight;

        let that = this;
        let $menuInner = this.$menuInner;
        let $menu = this.$menu;
        let $window = $(window);
        let selectHeight = this.$newElement[0].offsetHeight;
        let selectWidth = this.$newElement[0].offsetWidth;
        let liHeight = this.sizeInfo['liHeight'];
        let headerHeight = this.sizeInfo['headerHeight'];
        let searchHeight = this.sizeInfo['searchHeight'];
        let actionsHeight = this.sizeInfo['actionsHeight'];
        let doneButtonHeight = this.sizeInfo['doneButtonHeight'];
        let divHeight = this.sizeInfo['dividerHeight'];
        let menuPadding = this.sizeInfo['menuPadding'];
        let menuExtras = this.sizeInfo['menuExtras'];
        let notDisabled = this.options.hideDisabled ? '.disabled' : '';

        let getPos = function() {
            var pos = that.$newElement.offset();
            selectOffsetTop = pos.top - $window.scrollTop();
            selectOffsetBot = $window.height() - selectOffsetTop - selectHeight;
            selectOffsetLeft = pos.left - $window.scrollLeft();
            selectOffsetRight = $window.width() - selectOffsetLeft - selectWidth;
        };

        getPos();

        if (this.options.size === 'auto') {
            let getSize = function() {
                let minHeight;
                let hasClass = function(className, include) {
                    return function(element) {
                        if (include) {
                            return (element.classList ? element.classList.contains(className) : $(element).hasClass(className));
                        }
                        return !(element.classList ? element.classList.contains(className) : $(element).hasClass(className));
                    };
                };
                let lis = that.$menuInner[0].getElementsByTagName('li');
                let lisVisible = Array.prototype.filter ? Array.prototype.filter.call(lis, hasClass('hidden', false)) : that.$lis.not('.hidden');
                let optGroup = Array.prototype.filter ? Array.prototype.filter.call(lisVisible, hasClass('dropdown-header', true)) : lisVisible.filter('.dropdown-header');

                getPos();
                menuHeight = selectOffsetBot - menuExtras.vert;
                menuWidth = selectOffsetRight - menuExtras.horiz;

                if (that.options.container) {
                    if (!$menu.data('height')) $menu.data('height', $menu.height());
                    getHeight = $menu.data('height');

                    if (!$menu.data('width')) $menu.data('width', $menu.width());
                    getWidth = $menu.data('width');
                } else {
                    getHeight = $menu.height();
                    getWidth = $menu.width();
                }

                if (that.options.dropupAuto) {
                    that.$newElement.toggleClass('dropup', selectOffsetTop > selectOffsetBot && (menuHeight - menuExtras.vert) < getHeight);
                }

                if (that.$newElement.hasClass('dropup')) {
                    menuHeight = selectOffsetTop - menuExtras.vert;
                }

                if (that.options.dropdownAlignRight === 'auto') {
                    $menu.toggleClass('dropdown-menu-right', selectOffsetLeft > selectOffsetRight && (menuWidth - menuExtras.horiz) < (getWidth - selectWidth));
                }

                if ((lisVisible.length + optGroup.length) > 3) {
                    minHeight = liHeight * 3 + menuExtras.vert - 2;
                } else {
                    minHeight = 0;
                }

                $menu.css({
                    'max-height': menuHeight + 'px',
                    'overflow': 'hidden',
                    'min-height': minHeight + headerHeight + searchHeight + actionsHeight + doneButtonHeight + 'px',
                });
                $menuInner.css({
                    'max-height': menuHeight - headerHeight - searchHeight - actionsHeight - doneButtonHeight - menuPadding.vert + 'px',
                    'overflow-y': 'auto',
                    'min-height': Math.max(minHeight - menuPadding.vert, 0) + 'px',
                });
            };
            getSize();
            this.$searchbox.off('input.getSize propertychange.getSize').on('input.getSize propertychange.getSize', getSize);
            $window.off('resize.getSize scroll.getSize').on('resize.getSize scroll.getSize', getSize);
        } else if (this.options.size && this.options.size !== 'auto' && this.$lis.not(notDisabled).length > this.options.size) {
            let optIndex = this.$lis.not('.divider').not(notDisabled).children().slice(0, this.options.size).last().parent().index();
            let divLength = this.$lis.slice(0, optIndex + 1).filter('.divider').length;
            menuHeight = liHeight * this.options.size + divLength * divHeight + menuPadding.vert;

            if (that.options.container) {
                if (!$menu.data('height')) $menu.data('height', $menu.height());
                getHeight = $menu.data('height');
            } else {
                getHeight = $menu.height();
            }

            if (that.options.dropupAuto) {
                //noinspection JSUnusedAssignment
                this.$newElement.toggleClass('dropup', selectOffsetTop > selectOffsetBot && (menuHeight - menuExtras.vert) < getHeight);
            }
            $menu.css({
                'max-height': menuHeight + headerHeight + searchHeight + actionsHeight + doneButtonHeight + 'px',
                'overflow': 'hidden',
                'min-height': '',
            });
            $menuInner.css({
                'max-height': menuHeight - menuPadding.vert + 'px',
                'overflow-y': 'auto',
                'min-height': '',
            });
        }
    }


    setWidth() {
        if (this.options.width === 'auto') {
            this.$menu.css('min-width', '0');

            // Get correct width if element is hidden
            let $selectClone = this.$menu.parent().clone().appendTo('body');
            let $selectClone2 = this.options.container ? this.$newElement.clone().appendTo('body') : $selectClone;
            let ulWidth = $selectClone.children('.dropdown-menu').outerWidth();
            let btnWidth = $selectClone2.css('width', 'auto').children('button').outerWidth();

            $selectClone.remove();
            $selectClone2.remove();

            // Set width to whatever's larger, button title or longest option
            this.$newElement.css('width', Math.max(ulWidth, btnWidth) + 'px');
        } else if (this.options.width === 'fit') {
            // Remove inline min-width so width can be changed from 'auto'
            this.$menu.css('min-width', '');
            this.$newElement.css('width', '').addClass('fit-width');
        } else if (this.options.width) {
            // Remove inline min-width so width can be changed from 'auto'
            this.$menu.css('min-width', '');
            this.$newElement.css('width', this.options.width);
        } else {
            // Remove inline min-width/width so width can be changed
            this.$menu.css('min-width', '');
            this.$newElement.css('width', '');
        }
        // Remove fit-width class if width is changed programmatically
        if (this.$newElement.hasClass('fit-width') && this.options.width !== 'fit') {
            this.$newElement.removeClass('fit-width');
        }
    }


    selectPosition() {
        let pos, actualHeight;
        this.$bsContainer = $('<div class="bs-container" />');

        let that = this;
        let getPlacement = function($element) {
            that.$bsContainer.addClass($element.attr('class').replace(/form-control|fit-width/gi, '')).toggleClass('dropup', $element.hasClass('dropup'));
            pos = $element.offset();
            actualHeight = $element.hasClass('dropup') ? 0 : $element[0].offsetHeight;
            that.$bsContainer.css({
                'top': pos.top + actualHeight,
                'left': pos.left,
                'width': $element[0].offsetWidth,
            });
        };

        this.$button.on('click', function() {
            var $this = $(this);
            if (that.isDisabled()) {
                return;
            }
            getPlacement(that.$newElement);
            that.$bsContainer.appendTo(that.options.container).toggleClass('open', !$this.hasClass('open')).append(that.$menu);
        });

        $(window).on('resize scroll', function() {
            getPlacement(that.$newElement);
        });

        this.$element.on('hide.bs.select', function() {
            that.$menu.data('height', that.$menu.height());
            that.$bsContainer.detach();
        });
    }


    /**
    * @param {number} index - the index of the option that is being changed
    * @param {boolean} selected - true if the option is being selected, false if being deselected
    * @param {JQuery} $lis - the 'li' element that is being modified
    */
    setSelected(index, selected, $lis) {
        if (!$lis) {
            // check if setSelected is being called by changing the value of the select
            this.togglePlaceholder();
            $lis = this.findLis().eq(this.liObj[index]);
        }
        $lis.toggleClass('selected', selected);
    }


    /**
    * @param {number} index - the index of the option that is being disabled
    * @param {boolean} disabled - true if the option is being disabled, false if being enabled
    * @param {JQuery} $lis - the 'li' element that is being modified
    */
    setDisabled(index, disabled, $lis) {
        if (!$lis) {
            $lis = this.findLis().eq(this.liObj[index]);
        }

        if (disabled) {
            $lis.addClass('disabled').children('a').attr('href', '#').attr('tabindex', -1);
        } else {
            $lis.removeClass('disabled').children('a').removeAttr('href').attr('tabindex', 0);
        }
    }


    isDisabled() {
        return this.$element[0].disabled;
    }


    checkDisabled() {
        if (this.isDisabled()) {
            this.$newElement.addClass('disabled');
            this.$button.addClass('disabled').attr('tabindex', -1);
        } else {
            if (this.$button.hasClass('disabled')) {
                this.$newElement.removeClass('disabled');
                this.$button.removeClass('disabled');
            }

            if (this.$button.attr('tabindex') === -1 && !this.$element.data('tabindex')) {
                this.$button.removeAttr('tabindex');
            }
        }

        this.$button.click(() => {
            return !this.isDisabled();
        });
    }


    togglePlaceholder() {
        var value = this.$element.val();
        this.$button.toggleClass('bs-placeholder', value === null || value === '');
    }


    tabIndex() {
        if (this.$element.data('tabindex') !== this.$element.attr('tabindex') &&
        (this.$element.attr('tabindex') !== -98 && this.$element.attr('tabindex') !== '-98')) {
            this.$element.data('tabindex', this.$element.attr('tabindex'));
            this.$button.attr('tabindex', this.$element.data('tabindex'));
        }

        this.$element.attr('tabindex', -98);
    }


    clickListener() {
        let that = this;
        let $document = $(document);

        this.$newElement.on('touchstart.dropdown', '.dropdown-menu', function(e) {
            e.stopPropagation();
        });

        $document.data('spaceSelect', false);

        this.$button.on('keyup', function(e) {
            if (/(32)/.test(e.keyCode.toString(10)) && $document.data('spaceSelect')) {
                e.preventDefault();
                $document.data('spaceSelect', false);
            }
        });

        this.$button.on('click', function() {
            that.setSize();
        });

        this.$element.on('shown.bs.select', function() {
            if (!that.options.liveSearch && !that.multiple) {
                that.$menuInner.find('.selected a').focus();
            } else if (!that.multiple) {
                let selectedIndex = that.liObj[that.$element[0].selectedIndex];

                if (typeof selectedIndex !== 'number' || that.options.size === false) return;

                // scroll to selected option
                let offset = that.$lis.eq(selectedIndex)[0].offsetTop - that.$menuInner[0].offsetTop;
                offset = offset - that.$menuInner[0].offsetHeight / 2 + that.sizeInfo.liHeight / 2;
                that.$menuInner[0].scrollTop = offset;
            }
        });

        this.$menuInner.on('click', 'li a', function(e) {
            let $this = $(this);
            let clickedIndex = $this.parent().data('originalIndex');
            let prevValue = that.$element.val();
            let prevIndex = that.$element.prop('selectedIndex');
            let triggerChange = true;

            // Don't close on multi choice menu
            if (that.multiple && that.options.maxOptions !== 1) {
                e.stopPropagation();
            }

            e.preventDefault();

            //Don't run if we have been disabled
            if (!that.isDisabled() && !$this.parent().hasClass('disabled')) {
                let $options = that.$element.find('option');
                let $option = $options.eq(clickedIndex);
                let state = $option.prop('selected');
                let $optgroup = $option.parent('optgroup');
                let maxOptions = that.options.maxOptions;
                let maxOptionsGrp = $optgroup.data('maxOptions') || false;

                // Deselect all others if not multi select box
                if (!that.multiple) {
                    $options.prop('selected', false);
                    $option.prop('selected', true);
                    that.$menuInner.find('.selected').removeClass('selected');
                    that.setSelected(clickedIndex, true);
                } else {
                    // Toggle the one we have chosen if we are multi select.
                    $option.prop('selected', !state);
                    that.setSelected(clickedIndex, !state);
                    $this.blur();

                    if (maxOptions !== false || maxOptionsGrp !== false) {
                        let maxReached = maxOptions < $options.filter(':selected').length;
                        let maxReachedGrp = maxOptionsGrp < $optgroup.find('option:selected').length;

                        if ((maxOptions && maxReached) || (maxOptionsGrp && maxReachedGrp)) {
                            if (maxOptions && maxOptions === 1) {
                                $options.prop('selected', false);
                                $option.prop('selected', true);
                                that.$menuInner.find('.selected').removeClass('selected');
                                that.setSelected(clickedIndex, true);
                            } else if (maxOptionsGrp && maxOptionsGrp === 1) {
                                $optgroup.find('option:selected').prop('selected', false);
                                $option.prop('selected', true);
                                let optgroupID = $this.parent().data('optgroup');
                                that.$menuInner.find('[data-optgroup="' + optgroupID + '"]').removeClass('selected');
                                that.setSelected(clickedIndex, true);
                            } else {
                                let maxOptionsText = typeof that.options.maxOptionsText === 'string' ? [that.options.maxOptionsText, that.options.maxOptionsText] : that.options.maxOptionsText;
                                let maxOptionsArr = typeof maxOptionsText === 'function' ? maxOptionsText(maxOptions, maxOptionsGrp) : maxOptionsText;
                                let maxTxt = maxOptionsArr[0].replace('{n}', maxOptions);
                                let maxTxtGrp = maxOptionsArr[1].replace('{n}', maxOptionsGrp);
                                let $notify = $('<div class="notify"></div>');
                                // If {var} is set in array, replace it
                                /** @deprecated */
                                if (maxOptionsArr[2]) {
                                    maxTxt = maxTxt.replace('{var}', maxOptionsArr[2][maxOptions > 1 ? 0 : 1]);
                                    maxTxtGrp = maxTxtGrp.replace('{var}', maxOptionsArr[2][maxOptionsGrp > 1 ? 0 : 1]);
                                }

                                $option.prop('selected', false);
                                that.$menu.append($notify);

                                if (maxOptions && maxReached) {
                                    $notify.append($('<div>' + maxTxt + '</div>'));
                                    triggerChange = false;
                                    that.$element.trigger('maxReached.bs.select');
                                }

                                if (maxOptionsGrp && maxReachedGrp) {
                                    $notify.append($('<div>' + maxTxtGrp + '</div>'));
                                    triggerChange = false;
                                    that.$element.trigger('maxReachedGrp.bs.select');
                                }

                                setTimeout(function() {
                                    that.setSelected(clickedIndex, false);
                                }, 10);

                                $notify.delay(750).fadeOut(300, function() {
                                    $(this).remove();
                                });
                            }
                        }
                    }
                }

                if (!that.multiple || (that.multiple && that.options.maxOptions === 1)) {
                    that.$button.focus();
                } else if (that.options.liveSearch) {
                    that.$searchbox.focus();
                }

                // Trigger select 'change'
                if (triggerChange) {
                    if ((prevValue !== that.$element.val() && that.multiple) || (prevIndex !== that.$element.prop('selectedIndex') && !that.multiple)) {
                        // $option.prop('selected') is current option state (selected/unselected). state is previous option state.
                        that.$element
                        .trigger('changed.bs.select', [clickedIndex, $option.prop('selected'), state])
                        .triggerNative('change');
                    }
                }
            }
        });

        this.$menu.on('click', 'li.disabled a, .popover-title, .popover-title :not(.close)', function(e) {
            if (e.currentTarget === this) {
                e.preventDefault();
                e.stopPropagation();
                if (that.options.liveSearch && !$(e.target).hasClass('close')) {
                    that.$searchbox.focus();
                } else {
                    that.$button.focus();
                }
            }
        });

        this.$menuInner.on('click', '.divider, .dropdown-header', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (that.options.liveSearch) {
                that.$searchbox.focus();
            } else {
                that.$button.focus();
            }
        });

        this.$menu.on('click', '.popover-title .close', function() {
            that.$button.click();
        });

        this.$searchbox.on('click', function(e) {
            e.stopPropagation();
        });

        this.$menu.on('click', '.actions-btn', function(e) {
            if (that.options.liveSearch) {
                that.$searchbox.focus();
            } else {
                that.$button.focus();
            }

            e.preventDefault();
            e.stopPropagation();

            if ($(this).hasClass('bs-select-all')) {
                that.selectAll();
            } else {
                that.deselectAll();
            }
        });

        this.$element.change(function() {
            that.render(false);
        });
    }


    liveSearchListener() {
        let that = this;
        let $noResults = $('<li class="no-results"></li>');

        this.$button.on('click.dropdown.data-api touchstart.dropdown.data-api', function() {
            that.$menuInner.find('.active').removeClass('active');
            if (!!that.$searchbox.val()) {
                that.$searchbox.val('');
                that.$lis.not('.is-hidden').removeClass('hidden');
                if (!!$noResults.parent().length) $noResults.remove();
            }
            if (!that.multiple) that.$menuInner.find('.selected').addClass('active');
            setTimeout(function() {
                that.$searchbox.focus();
            }, 10);
        });

        this.$searchbox.on('click.dropdown.data-api focus.dropdown.data-api touchend.dropdown.data-api', function(e) {
            e.stopPropagation();
        });

        this.$searchbox.on('input propertychange', function() {
            if (that.$searchbox.val()) {
                let $searchBase = that.$lis.not('.is-hidden').removeClass('hidden').children('a');
                if (that.options.liveSearchNormalize) {
                    $searchBase = $searchBase.not(':a' + that._searchStyle() + '("' + normalizeToBase(that.$searchbox.val()) + '")');
                } else {
                    $searchBase = $searchBase.not(':' + that._searchStyle() + '("' + that.$searchbox.val() + '")');
                }
                $searchBase.parent().addClass('hidden');

                that.$lis.filter('.dropdown-header').each(function() {
                    let $this = $(this);
                    let optgroup = $this.data('optgroup');

                    if (that.$lis.filter('[data-optgroup=' + optgroup + ']').not($this).not('.hidden').length === 0) {
                        $this.addClass('hidden');
                        that.$lis.filter('[data-optgroup=' + optgroup + 'div]').addClass('hidden');
                    }
                });

                let $lisVisible = that.$lis.not('.hidden');

                // hide divider if first or last visible, or if followed by another divider
                $lisVisible.each(function(index) {
                    var $this = $(this);

                    if ($this.hasClass('divider') && ($this.index() === $lisVisible.first().index() || $this.index() === $lisVisible.last().index() || $lisVisible.eq(index + 1).hasClass('divider'))) {
                        $this.addClass('hidden');
                    }
                });

                if (!that.$lis.not('.hidden, .no-results').length) {
                    if (!!$noResults.parent().length) {
                        $noResults.remove();
                    }
                    $noResults.html(that.options.noneResultsText.replace('{0}', '"' + htmlEscape(that.$searchbox.val()) + '"')).show();
                    that.$menuInner.append($noResults);
                } else if (!!$noResults.parent().length) {
                    $noResults.remove();
                }
            } else {
                that.$lis.not('.is-hidden').removeClass('hidden');
                if (!!$noResults.parent().length) {
                    $noResults.remove();
                }
            }

            that.$lis.filter('.active').removeClass('active');
            if (that.$searchbox.val()) that.$lis.not('.hidden, .divider, .dropdown-header').eq(0).addClass('active').children('a').focus();
            $(this).focus();
        });
    }


    _searchStyle() {
        var styles = {
            begins: 'ibegins',
            startsWith: 'ibegins',
        };

        return styles[this.options.liveSearchStyle] || 'icontains';
    }


    val(value) {
        if (typeof value !== 'undefined') {
            this.$element.val(value);
            this.render();
            return this.$element;
        }
        return this.$element.val();
    }


    changeAll(status) {
        if (!this.multiple) return;
        if (typeof status === 'undefined') status = true;

        this.findLis();

        let $options = this.$element.find('option');
        let $lisVisible = this.$lis.not('.divider, .dropdown-header, .disabled, .hidden');
        let lisVisLen = $lisVisible.length;
        let selectedOptions = [];

        if (status) {
            if ($lisVisible.filter('.selected').length === $lisVisible.length) return;
        } else {
            if ($lisVisible.filter('.selected').length === 0) return;
        }

        $lisVisible.toggleClass('selected', status);

        for (let i = 0; i < lisVisLen; i++) {
            let origIndex = $lisVisible[i].getAttribute('data-original-index');
            selectedOptions[selectedOptions.length] = $options.eq(origIndex)[0];
        }

        $(selectedOptions).prop('selected', status);
        this.render(false);
        this.togglePlaceholder();
        this.$element.trigger('changed.bs.select').triggerNative('change');
    }


    selectAll() {
        return this.changeAll(true);
    }


    deselectAll() {
        return this.changeAll(false);
    }


    toggle(e) {
        e = e || window.event;
        if (e) e.stopPropagation();
        this.$button.trigger('click');
    }


    keydown(e) {
        let $this = $(this);
        let $parent = $this.is('input') ? $this.parent().parent() : $this.parent();
        let that = $parent.data('this');
        let selector = ':not(.disabled, .hidden, .dropdown-header, .divider)';
        let keyCodeMap = {
            32: ' ',
            48: '0',
            49: '1',
            50: '2',
            51: '3',
            52: '4',
            53: '5',
            54: '6',
            55: '7',
            56: '8',
            57: '9',
            59: ';',
            65: 'a',
            66: 'b',
            67: 'c',
            68: 'd',
            69: 'e',
            70: 'f',
            71: 'g',
            72: 'h',
            73: 'i',
            74: 'j',
            75: 'k',
            76: 'l',
            77: 'm',
            78: 'n',
            79: 'o',
            80: 'p',
            81: 'q',
            82: 'r',
            83: 's',
            84: 't',
            85: 'u',
            86: 'v',
            87: 'w',
            88: 'x',
            89: 'y',
            90: 'z',
            96: '0',
            97: '1',
            98: '2',
            99: '3',
            100: '4',
            101: '5',
            102: '6',
            103: '7',
            104: '8',
            105: '9',
        };

        if (that.options.liveSearch) $parent = $this.parent().parent();
        if (that.options.container) $parent = that.$menu;
        let $items = $('[role=menu] li', $parent);
        let isActive = that.$newElement.hasClass('open');

        if (!isActive && (e.keyCode >= 48 && e.keyCode <= 57 || e.keyCode >= 96 && e.keyCode <= 105 || e.keyCode >= 65 && e.keyCode <= 90)) {
            if (!that.options.container) {
                that.setSize();
                that.$menu.parent().addClass('open');
                isActive = true;
            } else {
                that.$button.trigger('click');
            }
            that.$searchbox.focus();
            return;
        }

        if (that.options.liveSearch) {
            if (/(^9$|27)/.test(e.keyCode.toString(10)) && isActive && that.$menu.find('.active').length === 0) {
                e.preventDefault();
                that.$menu.parent().removeClass('open');
                if (that.options.container) that.$newElement.removeClass('open');
                that.$button.focus();
            }
            // $items contains li elements when liveSearch is enabled
            $items = $('[role=menu] li' + selector, $parent);
            if (!$this.val() && !/(38|40)/.test(e.keyCode.toString(10))) {
                if ($items.filter('.active').length === 0) {
                    $items = that.$menuInner.find('li');
                    if (that.options.liveSearchNormalize) {
                        $items = $items.filter(':a' + that._searchStyle() + '(' + normalizeToBase(keyCodeMap[e.keyCode]) + ')');
                    } else {
                        $items = $items.filter(':' + that._searchStyle() + '(' + keyCodeMap[e.keyCode] + ')');
                    }
                }
            }
        }

        if (!$items.length) return;

        if (/(38|40)/.test(e.keyCode.toString(10))) {
            let index = $items.index($items.find('a').filter(':focus').parent());
            let first = $items.filter(selector).first().index();
            let last = $items.filter(selector).last().index();
            let next = $items.eq(index).nextAll(selector).eq(0).index();
            let prev = $items.eq(index).prevAll(selector).eq(0).index();
            let nextPrev = $items.eq(next).prevAll(selector).eq(0).index();

            if (that.options.liveSearch) {
                $items.each(function(i) {
                    if (!$(this).hasClass('disabled')) {
                        $(this).data('index', i);
                    }
                });
                index = $items.index($items.filter('.active'));
                first = $items.first().data('index');
                last = $items.last().data('index');
                next = $items.eq(index).nextAll().eq(0).data('index');
                prev = $items.eq(index).prevAll().eq(0).data('index');
                nextPrev = $items.eq(next).prevAll().eq(0).data('index');
            }

            let prevIndex = $this.data('prevIndex');

            if (e.keyCode === 38) {
                if (that.options.liveSearch) index--;
                if (index !== nextPrev && index > prev) index = prev;
                if (index < first) index = first;
                if (index === prevIndex) index = last;
            } else if (e.keyCode === 40) {
                if (that.options.liveSearch) index++;
                if (index === -1) index = 0;
                if (index !== nextPrev && index < next) index = next;
                if (index > last) index = last;
                if (index === prevIndex) index = first;
            }

            $this.data('prevIndex', index);

            if (!that.options.liveSearch) {
                $items.eq(index).children('a').focus();
            } else {
                e.preventDefault();
                if (!$this.hasClass('dropdown-toggle')) {
                    $items.removeClass('active').eq(index).addClass('active').children('a').focus();
                    $this.focus();
                }
            }
        } else if (!$this.is('input')) {
            let count, prevKey;
            let keyIndex = [];

            $items.each(function() {
                if (!$(this).hasClass('disabled')) {
                    if ($.trim($(this).children('a').text().toLowerCase()).substring(0, 1) === keyCodeMap[e.keyCode]) {
                        keyIndex.push($(this).index());
                    }
                }
            });

            count = $(document).data('keycount');
            count++;
            $(document).data('keycount', count);

            prevKey = $.trim($(':focus').text().toLowerCase()).substring(0, 1);

            if (prevKey !== keyCodeMap[e.keyCode]) {
                count = 1;
                $(document).data('keycount', count);
            } else if (count >= keyIndex.length) {
                $(document).data('keycount', 0);
                if (count > keyIndex.length) count = 1;
            }

            $items.eq(keyIndex[count - 1]).children('a').focus();
        }

        // Select focused option if "Enter", "Spacebar" or "Tab" (when selectOnTab is true) are pressed inside the menu.
        if ((/(13|32)/.test(e.keyCode.toString(10)) || (/(^9$)/.test(e.keyCode.toString(10)) && that.options.selectOnTab)) && isActive) {
            if (!/(32)/.test(e.keyCode.toString(10))) e.preventDefault();
            if (!that.options.liveSearch) {
                let elem = $(':focus');
                elem.click();
                // Bring back focus for multiselects
                elem.focus();
                // Prevent screen from scrolling if the user hit the spacebar
                e.preventDefault();
                // Fixes spacebar selection of dropdown items in FF & IE
                $(document).data('spaceSelect', true);
            } else if (!/(32)/.test(e.keyCode.toString(10))) {
                that.$menuInner.find('.active a').click();
                $this.focus();
            }
            $(document).data('keycount', 0);
        }

        if ((/(^9$|27)/.test(e.keyCode.toString(10)) && isActive && (that.multiple || that.options.liveSearch)) || (/(27)/.test(e.keyCode.toString(10)) && !isActive)) {
            that.$menu.parent().removeClass('open');
            if (that.options.container) that.$newElement.removeClass('open');
            that.$button.focus();
        }
    }


    mobile() {
        this.$element.addClass('mobile-device');
    }


    refresh() {
        this.$lis = null;
        this.liObj = {};
        this.reloadLi();
        this.render();
        this.checkDisabled();
        this.liHeight(true);
        this.setStyle();
        this.setWidth();
        if (this.$lis) this.$searchbox.trigger('propertychange');
        this.$element.trigger('refreshed.bs.select');
    }


    hide() {
        this.$newElement.hide();
    }


    show() {
        this.$newElement.show();
    }


    remove() {
        this.$newElement.remove();
        this.$element.remove();
    }


    destroy() {
        this.$newElement.before(this.$element).remove();

        if (this.$bsContainer) {
            this.$bsContainer.remove();
        } else {
            this.$menu.remove();
        }

        this.$element.off('.bs.select').removeData('selectpicker').removeClass('bs-select-hidden selectpicker');
    }

}


Select3.VERSION = '0.1.0';
Select3.DEFAULTS = {
    noneSelectedText: 'Nothing selected',
    noneResultsText: 'No results matched {0}',
    countSelectedText: function(numSelected, numTotal) {
        return (numSelected === 1) ? '{0} item selected' : '{0} items selected';
    },
    maxOptionsText: function(numAll, numGroup) {
        return [
            (numAll === 1) ? 'Limit reached ({n} item max)' : 'Limit reached ({n} items max)',
            (numGroup === 1) ? 'Group limit reached ({n} item max)' : 'Group limit reached ({n} items max)',
        ];
    },
    selectAllText: 'Select All',
    deselectAllText: 'Deselect All',
    doneButton: false,
    doneButtonText: 'Close',
    multipleSeparator: ', ',
    styleBase: 'btn',
    style: 'btn-default',
    size: 'auto',
    title: null,
    selectedTextFormat: 'values',
    width: false,
    container: false,
    hideDisabled: false,
    showSubtext: false,
    showIcon: true,
    showContent: true,
    dropupAuto: true,
    header: false,
    liveSearch: false,
    liveSearchPlaceholder: null,
    liveSearchNormalize: false,
    liveSearchStyle: 'contains',
    actionsBox: false,
    iconBase: 'glyphicon',
    tickIcon: 'glyphicon-ok',
    showTick: false,
    template: {
        caret: '<span class="caret"></span>',
    },
    maxOptions: false,
    mobile: false,
    selectOnTab: false,
    dropdownAlignRight: false,
};


/**
 * Select3 plugin definition
 */
$.fn.select3 = function(option, event) {
    // get the args of the outer function..
    let args = arguments;
    // The arguments of the function are explicitly re-defined from the argument list,
    // because the shift causes them to get lost/corrupted in android 2.3 and IE9 #715 #775
    let _option = option;
    let _event = event;

    [].shift.apply(args);
    let value;
    let chain = this.each(function() {
        let $this = $(this);
        if ($this.is('select')) {
            let data = $this.data('selectpicker');
            let options = typeof _option === 'object' && _option;

            if (!data) {
                let config = $.extend({}, Select3.DEFAULTS, $.fn.select3.defaults || {}, $this.data(), options);
                config.template = $.extend({}, Select3.DEFAULTS.template, ($.fn.select3.defaults ? $.fn.select3.defaults.template : {}), $this.data().template, options.template);
                $this.data('selectpicker', (data = new Select3(this, config, _event)));
            } else if (options) {
                for (let i in options) {
                    if (options.hasOwnProperty(i)) {
                        data.options[i] = options[i];
                    }
                }
            }

            if (typeof _option === 'string') {
                if (data[_option] instanceof Function) {
                    value = data[_option].apply(data, args);
                } else {
                    value = data.options[_option];
                }
            }
        }
    });

    if (typeof value !== 'undefined') {
        //noinspection JSUnusedAssignment
        return value;
    }
    return chain;
};


$(document).data('keycount', 0)
.on('keydown.bs.select', '.bootstrap-select [data-toggle=dropdown], .bootstrap-select [role="menu"], .bs-searchbox input', Select3.prototype.keydown)
.on('focusin.modal', '.bootstrap-select [data-toggle=dropdown], .bootstrap-select [role="menu"], .bs-searchbox input', function(e) {
    e.stopPropagation();
});
