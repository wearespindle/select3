'use strict';

/**
 * Bootstrap-select v1.8.0 (http://silviomoreto.github.io/bootstrap-select)
 * Copyright 2013-2015 bootstrap-select
 * Licensed under MIT (https://github.com/silviomoreto/bootstrap-select/blob/master/LICENSE)
 *
 * Select3 (https://github.com/wearespindle/select3)
 * Licensed under MIT (https://github.com/wearespindle/select3/blob/master/LICENSE.md)
 */
let timeits = {};
let debug;  // set in select3 constructor
function timeit(message) {
    if (!debug) return;

    let now = Math.round(performance.now() * 100) / 100;
    let delta, logMsg;
    if (Object.keys(timeits).indexOf(message) === -1) {
        timeits[message] = now;
        console.log(message + ' at ' + now);
        return;
    }
    delta = Math.round((now - timeits[message]) * 100) / 100;
    logMsg = message + ' at ' + now + ' took ' + delta;
    console.log(logMsg);

    delete timeits[message];
}


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

        debug = options.debug || false;

        // If we have no title yet, try to pull it from the html title attribute (jQuery doesnt' pick it up as it's not a
        // data-attribute)
        if (this.options.title === null) {
            this.options.title = this.$element.attr('title');
        }

        this.init();
    }


    init() {
        var id = this.$element.attr('id');
        timeit('init ' + id);
        this.$element.addClass('bs-select-hidden');

        // store originalIndex (key) and newIndex (value) in this.liObj for fast accessibility
        // allows us to do this.$lis.eq(this.liObj[index]) instead of this.$lis.filter('[data-original-index="' + index + '"]')
        this.liObj = {};
        this.multiple = this.$element.prop('multiple');
        this.autofocus = this.$element.prop('autofocus');
        timeit('createView');
        this.$newElement = this.createView();
        timeit('createView');

        this.$element.addClass('select3').after(this.$newElement);
        this.$button = this.$newElement.children('button');
        this.$menu = this.$newElement.children('.dropdown-menu');
        this.$menuInner = this.$menu.children('.inner');
        this.$searchbox = this.$menu.find('input');
        this.$noResults = $('<li class="no-results"></li>');

        this.$element.removeClass('bs-select-hidden');

        if (this.options.dropdownAlignRight === true) this.$menu.addClass('dropdown-menu-right');

        if (typeof id !== 'undefined') {
            this.$button.attr('data-id', id);
            $('label[for="' + id + '"]').click((e) => {
                e.preventDefault();
                this.$button.focus();
            });
        }

        this.checkDisabled();
        this.setClickListeners();

        if (this.options.liveSearch) this.setLiveSearchListeners();

        this.render();
        this.setStyle();
        timeit('setWidth');
        this.setWidth();
        timeit('setWidth');

        if (this.options.container) this.selectPosition();

        this.$menu.data('this', this);
        this.$newElement.data('this', this);

        if (this.options.mobile) this.mobile();

        this.$newElement.on({
            'hide.bs.dropdown': (e) => {
                this.$element.trigger('hide.bs.select', e);
            },
            'hidden.bs.dropdown': (e) => {
                this.$element.trigger('hidden.bs.select', e);
            },
            'show.bs.dropdown': (e) => {
                this.$element.trigger('show.bs.select', e);
            },
            'shown.bs.dropdown': (e) => {
                this.$element.trigger('shown.bs.select', e);
            },
        });
        let _this = this;
        if (this.$element[0].hasAttribute('required')) {
            this.$element.on('invalid', () => {
                this.$button.addClass('bs-invalid').focus();
                this.$element.on({
                    'focus.bs.select': () => {
                        this.$button.focus();
                        this.$element.off('focus.bs.select');
                    },
                    'shown.bs.select': () => {
                        // set the value to hide the validation message in Chrome when menu is opened
                        this.$element.val(this.$element.val()).off('shown.bs.select');
                    },
                    'rendered.bs.select': function() {
                        // if select is no longer invalid, remove the bs-invalid class.
                        // Keep _this/function scope reference, since I don't know where this.validity comes from.
                        if (this.validity.valid) _this.$button.removeClass('bs-invalid');
                        _this.$element.off('rendered.bs.select');
                    },
                });
            });
        }

        setTimeout(() => {
            this.$element.trigger('loaded.bs.select');
        });
        timeit('init ' + id);
    }


    createDropdown() {
        // Options
        // If we are multiple or showTick option is set, then add the show-tick class
        let showTick = (this.multiple || this.options.showTick) ? ' show-tick' : '';
        let inputGroup = this.$element.parent().hasClass('input-group') ? ' input-group-btn' : '';
        let autofocus = this.autofocus ? ' autofocus' : '';
        // Elements
        let header = this.options.header ? '<div class="popover-title"><button type="button" class="close" aria-hidden="true">&times;</button>' + this.options.header + '</div>' : '';
        let searchbox = this.options.liveSearch ?
            '<div class="bs-searchbox">' +
            '<input type="text" class="form-control" autocomplete="off"' +
            (this.options.liveSearchPlaceholder === null ? '' : ' placeholder="' + htmlEscape(this.options.liveSearchPlaceholder) + '"') + '>' +
            '</div>' : '';
        let actionsbox = this.multiple && this.options.actionsBox ?
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
        let donebutton = this.multiple && this.options.doneButton ?
            '<div class="bs-donebutton">' +
            '<div class="btn-group btn-block">' +
            '<button type="button" class="btn btn-sm btn-default">' +
            this.options.doneButtonText +
            '</button>' +
            '</div>' +
            '</div>' : '';
        let drop = '<div class="btn-group select3' + showTick + inputGroup + '">' +
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
        let $drop = this.createDropdown();
        timeit('createLi');
        let li = this.createLi();
        timeit('createLi');
        $drop.find('ul')[0].innerHTML = li;
        return $drop;
    }


    reloadLi() {
        var li;
        //Remove all children.
        this.destroyLi();
        //Rebuild.
        li = this.createLi();
        this.$menuInner[0].innerHTML = li;
    }


    destroyLi() {
        this.$menu.find('li').remove();
    }


    createLi() {
        var _li = [];
        var optgroupIndex = 0;
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
        var generateLI = function(content, index, classes, optgroup, _optgroupIndex) {
            return '<li' +
            ((typeof classes !== 'undefined' & classes !== '') ? ' class="' + classes + '"' : '') +
            ((typeof index !== 'undefined' & index !== null) ? ' data-original-index="' + index + '"' : '') +
            ((typeof optgroup !== 'undefined' & optgroup !== null) ? ' data-optgroup="' + optgroup + '"' : '') +
            ((typeof _optgroupIndex !== 'undefined' & _optgroupIndex !== null) ? ' data-optgroup-index="' + _optgroupIndex + '"' : '') +
            '>' + content + '</li>';
        };

        /**
        * @param text
        * @param [classes]
        * @param [inline]
        * @param [tokens]
        * @returns {string}
        */
        var generateA = (text, classes, inline, tokens) => {
            return '<a tabindex="0"' +
            (typeof classes !== 'undefined' ? ' class="' + classes + '"' : '') +
            (typeof inline !== 'undefined' ? ' style="' + inline + '"' : '') +
            (this.options.liveSearchNormalize ? ' data-normalized-text="' + normalizeToBase(htmlEscape(text)) + '"' : '') +
            (typeof tokens !== 'undefined' || tokens !== null ? ' data-tokens="' + tokens + '"' : '') +
            '>' + text +
            '<span class="' + this.options.iconBase + ' ' + this.options.tickIcon + ' check-mark"></span>' +
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


        this.$element.find('option').each((index, el) => {
            var $target = $(el);
            liIndex++;

            if ($target.hasClass('bs-title-option')) return;

            // Get the class and text for the option
            let optionClass = el.className || '';
            let inline = el.style.cssText;
            let text = $target.data('content') ? $target.data('content') : $target.html();
            let tokens = $target.data('tokens') ? $target.data('tokens') : null;
            let subtext = typeof $target.data('subtext') !== 'undefined' ? '<small class="text-muted">' + $target.data('subtext') + '</small>' : '';
            let icon = typeof $target.data('icon') !== 'undefined' ? '<span class="' + this.options.iconBase + ' ' + $target.data('icon') + '"></span> ' : '';
            let $parent = $target.parent();
            let isOptgroup = $parent[0].tagName === 'OPTGROUP';
            let isOptgroupDisabled = isOptgroup && $parent[0].disabled;
            let isDisabled = el.disabled || isOptgroupDisabled;

            if (icon !== '' && isDisabled) {
                icon = '<span>' + icon + '</span>';
            }

            if (this.options.hideDisabled && (isDisabled && !isOptgroup || isOptgroupDisabled)) {
                liIndex--;
                return;
            }

            if (!$target.data('content')) {
                // Prepend any icon and append any subtext to the main text.
                text = icon + '<span class="text">' + text + subtext + '</span>';
            }

            if (isOptgroup && $target.data('divider') !== true) {
                if (this.options.hideDisabled && isDisabled) {
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

                if ($target[0] === $parent[0].firstElementChild) { // Is it the first option of the optgroup?
                    optgroupIndex = 0;
                    optID += 1;

                    // Get the opt group label
                    let label = $parent[0].label;
                    let labelSubtext = typeof $parent.data('subtext') !== 'undefined' ? '<small class="text-muted">' + $parent.data('subtext') + '</small>' : '';
                    let labelIcon = $parent.data('icon') ? '<span class="' + this.options.iconBase + ' ' + $parent.data('icon') + '"></span> ' : '';

                    label = labelIcon + '<span class="text">' + label + labelSubtext + '</span>';
                    // Is it NOT the first option of the select && are there elements in the dropdown?
                    if (index !== 0 && _li.length > 0) {
                        liIndex++;
                        _li.push(generateLI('', null, 'divider', optID + 'div'));
                    }
                    liIndex++;
                    _li.push(generateLI(label, null, 'dropdown-header' + optGroupClass, optID));
                }

                if (this.options.hideDisabled && isDisabled) {
                    liIndex--;
                    return;
                }

                _li.push(generateLI(generateA(text, 'opt ' + optionClass + optGroupClass, inline, tokens), index, '', optID, optgroupIndex));
                optgroupIndex++;
            } else if ($target.data('divider') === true) {
                _li.push(generateLI('', index, 'divider'));
            } else if ($target.data('hidden') === true) {
                _li.push(generateLI(generateA(text, optionClass, inline, tokens), index, 'hidden is-hidden'));
            } else {
                let showDivider = el.previousElementSibling && el.previousElementSibling.tagName === 'OPTGROUP';

                // if previous element is not an optgroup and hideDisabled is true
                if (!showDivider && this.options.hideDisabled) {
                    // get previous elements
                    let $prev = $target.prevAll();
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

            this.liObj[index] = liIndex;
        });
        // End of this.$element.find('option')


        //If we are not multiple, we don't have a selected item, and we don't have a title,
        // select the first element so something is set in the button.
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

        // Update the LI to match the SELECT
        if (updateLi !== false) {
            this.$element.find('option').each((index, el) => {
                let $lis = this.findLis().eq(this.liObj[index]);
                this.setDisabled(index, el.disabled || el.parentNode.tagName === 'OPTGROUP' && el.parentNode.disabled, $lis);
                this.setSelected(index, el.selected, $lis);
            });

            this.togglePlaceholder();
        }

        this.tabIndex();

        let selectedItems = this.$element.find('option').map((i, el) => {
            if (el.selected) {
                if (this.options.hideDisabled && (el.disabled || el.parentNode.tagName === 'OPTGROUP' && el.parentNode.disabled)) return null;

                let $el = $(el);
                let icon = $el.data('icon') && this.options.showIcon ? '<i class="' + this.options.iconBase + ' ' + $el.data('icon') + '"></i> ' : '';
                let subtext;

                if (this.options.showSubtext && $el.data('subtext') && !this.multiple) {
                    subtext = ' <small class="text-muted">' + $el.data('subtext') + '</small>';
                } else {
                    subtext = '';
                }
                if (typeof $el.attr('title') !== 'undefined') {
                    return $el.attr('title');
                } else if ($el.data('content') && this.options.showContent) {
                    return $el.data('content');
                }
                return icon + $el.html() + subtext;
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
            this.$newElement.addClass(this.$element.attr('class').replace(/select3|mobile-device|bs-select-hidden|validate\[.*\]/gi, ''));
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


    /**
     * Determines and sets the height of the opened select dropdown.
     */
    setSize() {
        this.findLis();
        this.liHeight();

        if (this.options.header) this.$menu.css('padding-top', 0);
        if (this.options.size === false) return;

        let menuHeight, menuWidth, getHeight, getWidth, selectOffsetTop, selectOffsetBot, selectOffsetLeft, selectOffsetRight;

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

        let getPos = () => {
            var pos = this.$newElement.offset();
            selectOffsetTop = pos.top - $window.scrollTop();
            selectOffsetBot = $window.height() - selectOffsetTop - selectHeight;
            selectOffsetLeft = pos.left - $window.scrollLeft();
            selectOffsetRight = $window.width() - selectOffsetLeft - selectWidth;
        };

        getPos();

        if (this.options.size === 'auto') {
            /**
             * Inline function to determine the size of the container.
             */
            let getSize = () => {
                let minHeight;
                let hasClass = function(className, include) {
                    return function(element) {
                        if (include) {
                            return (element.classList ? element.classList.contains(className) : $(element).hasClass(className));
                        }
                        return !(element.classList ? element.classList.contains(className) : $(element).hasClass(className));
                    };
                };
                let lis = this.$menuInner[0].getElementsByTagName('li');
                let lisVisible = Array.prototype.filter ? Array.prototype.filter.call(lis, hasClass('hidden', false)) : this.$lis.not('.hidden');
                let optGroup = Array.prototype.filter ? Array.prototype.filter.call(lisVisible, hasClass('dropdown-header', true)) : lisVisible.filter('.dropdown-header');

                getPos();
                menuHeight = selectOffsetBot - menuExtras.vert;
                menuWidth = selectOffsetRight - menuExtras.horiz;

                if (this.options.container) {
                    if (!$menu.data('height')) $menu.data('height', $menu.height());
                    getHeight = $menu.data('height');

                    if (!$menu.data('width')) $menu.data('width', $menu.width());
                    getWidth = $menu.data('width');
                } else {
                    getHeight = $menu.height();
                    getWidth = $menu.width();
                }

                if (this.options.dropupForce) {
                    this.$newElement.addClass('dropup');
                } else if (this.options.dropupAuto) {
                    this.$newElement.toggleClass('dropup', selectOffsetTop > selectOffsetBot && (menuHeight - menuExtras.vert) < getHeight);
                }

                if (this.$newElement.hasClass('dropup')) {
                    menuHeight = selectOffsetTop - menuExtras.vert;
                }

                if (this.options.dropdownAlignRight === 'auto') {
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
            let optIndex = this.$lis.not('.divider').not(notDisabled).children().slice(0, this.options.size).last().parent().data('optgroup-index');
            let divLength = this.$lis.slice(0, optIndex + 1).filter('.divider').length;
            menuHeight = liHeight * this.options.size + divLength * divHeight + menuPadding.vert;

            if (this.options.container) {
                if (!$menu.data('height')) $menu.data('height', $menu.height());
                getHeight = $menu.data('height');
            } else {
                getHeight = $menu.height();
            }

            if (this.options.dropupAuto) {
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

        let getPlacement = ($element) => {
            this.$bsContainer.addClass($element.attr('class').replace(/form-control|fit-width/gi, '')).toggleClass('dropup', $element.hasClass('dropup'));
            pos = $element.offset();
            actualHeight = $element.hasClass('dropup') ? 0 : $element[0].offsetHeight;
            this.$bsContainer.css({
                top: pos.top + actualHeight,
                left: pos.left,
                width: $element[0].offsetWidth,
            });
        };

        // Append the Select3 container to the specified container and toggle the open class.
        this.$bsContainer.appendTo(this.options.container).append(this.$menu);

        this.$button.on('click', (e) => {
            if (this.isDisabled()) {
                return;
            }
            getPlacement(this.$newElement);
            this.$bsContainer.toggleClass('open');
        });

        $(window).off('resize scroll').on('resize scroll', () => {
            getPlacement(this.$newElement);
        });

        this.$element.on('hide.bs.select', () => {
            this.$menu.data('height', this.$menu.height());
            this.$bsContainer.detach();
        });
    }


    /**
     * Close an active select.
     */
    deactivate() {
        if (this.$bsContainer) {
            this.$bsContainer.removeClass('open');
        }

        $(this.$newElement).removeClass('open');
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


    /**
     * Disables the select click handler when the select is disabled.
     */
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


    /**
     * Handles the case when a user clicks an option in the rendered select3.
     * @param {$.Event} $target - The Jquery selector for the related <option><a/> tag.
     */
    selectOption($target) {
        let clickedIndex = $target.parent().data('originalIndex');
        let prevValue = this.$element.val();
        let prevIndex = this.$element.prop('selectedIndex');
        let triggerChange = true;

        //Don't run if we have been disabled
        if (!this.isDisabled() && !$target.parent().hasClass('disabled')) {
            let $options = this.$element.find('option');
            let $option = $options.eq(clickedIndex);
            let state = $option.prop('selected');
            let $optgroup = $option.parent('optgroup');
            let maxOptions = this.options.maxOptions;
            let maxOptionsGrp = $optgroup.data('maxOptions') || false;

            // Deselect all others if not multi select box
            if (!this.multiple) {
                $options.prop('selected', false);
                $option.prop('selected', true);
                this.$menuInner.find('.selected').removeClass('selected');
                this.setSelected(clickedIndex, true);
            } else {
                // Toggle the one we have chosen if we are multi select.
                $option.prop('selected', !state);
                this.setSelected(clickedIndex, !state);
                $target.blur();

                if (maxOptions !== false || maxOptionsGrp !== false) {
                    let maxReached = maxOptions < $options.filter(':selected').length;
                    let maxReachedGrp = maxOptionsGrp < $optgroup.find('option:selected').length;

                    if ((maxOptions && maxReached) || (maxOptionsGrp && maxReachedGrp)) {
                        if (maxOptions && maxOptions === 1) {
                            $options.prop('selected', false);
                            $option.prop('selected', true);
                            this.$menuInner.find('.selected').removeClass('selected');
                            this.setSelected(clickedIndex, true);
                        } else if (maxOptionsGrp && maxOptionsGrp === 1) {
                            $optgroup.find('option:selected').prop('selected', false);
                            $option.prop('selected', true);
                            let optgroupID = $target.parent().data('optgroup');
                            this.$menuInner.find('[data-optgroup="' + optgroupID + '"]').removeClass('selected');
                            this.setSelected(clickedIndex, true);
                        } else {
                            let maxOptionsText = typeof this.options.maxOptionsText === 'string' ? [this.options.maxOptionsText, this.options.maxOptionsText] : this.options.maxOptionsText;
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
                            this.$menu.append($notify);

                            if (maxOptions && maxReached) {
                                $notify.append($('<div>' + maxTxt + '</div>'));
                                triggerChange = false;
                                this.$element.trigger('maxReached.bs.select');
                            }

                            if (maxOptionsGrp && maxReachedGrp) {
                                $notify.append($('<div>' + maxTxtGrp + '</div>'));
                                triggerChange = false;
                                this.$element.trigger('maxReachedGrp.bs.select');
                            }

                            setTimeout(() => {
                                this.setSelected(clickedIndex, false);
                            }, 10);

                            $notify.delay(750).fadeOut(300, function() {
                                $(this).remove();
                            });
                        }
                    }
                }
            }

            if (!this.multiple || (this.multiple && this.options.maxOptions === 1)) {
                this.$button.focus();
            } else if (this.options.liveSearch) {
                this.$searchbox.focus();
            }

            // Trigger select 'change'
            if (triggerChange) {
                if ((prevValue !== this.$element.val() && this.multiple) || (prevIndex !== this.$element.prop('selectedIndex') && !this.multiple)) {
                    // $option.prop('selected') is current option state (selected/unselected). The `state` is the
                    // previous option state.
                    this.$element.trigger('changed.bs.select', [clickedIndex, $option.prop('selected'), state]);
                    this.$element.trigger('change', this);
                    this.$element.trigger('item_clicked', this);
                }
            }
        }
    }


    setClickListeners() {
        let $document = $(document);

        this.$newElement.on('touchstart.dropdown', '.dropdown-menu', (e) => {
            e.stopPropagation();
        });

        $document.data('spaceSelect', false);

        this.$button.on('keyup', (e) => {
            if (/(32)/.test(e.keyCode.toString(10)) && $document.data('spaceSelect')) {
                e.preventDefault();
                $document.data('spaceSelect', false);
            }
        });

        this.$button.on('click', this.setSize.bind(this));

        this.$element.on('shown.bs.select', () => {
            if (!this.options.liveSearch && !this.multiple) {
                this.$menuInner.find('.selected a').focus();
            } else if (!this.multiple) {
                let selectedIndex = this.liObj[this.$element[0].selectedIndex];

                if (typeof selectedIndex !== 'number' || this.options.size === false) return;

                // scroll to selected option
                let offset = this.$lis.eq(selectedIndex)[0].offsetTop - this.$menuInner[0].offsetTop;
                offset = offset - this.$menuInner[0].offsetHeight / 2 + this.sizeInfo.liHeight / 2;
                this.$menuInner[0].scrollTop = offset;
            }
        });

        this.$menuInner.on('click', 'li a', (e) => {
            let $target = $(e.currentTarget);
            this.$element.trigger('before_change', $target);
            // Allows to programmatically supress changing the selected item.
            // Don't close when it's a multiple choice menu.
            if (this.multiple && this.options.maxOptions !== 1) {
                e.stopPropagation();
            }
            e.preventDefault();

            if (!this.omitChange) {
                this.selectOption($target);
            }
        });

        // e.currentTarget and this should be the same.
        this.$menu.on('click', 'li.disabled a, .popover-title, .popover-title :not(.close)', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.options.liveSearch && !$(e.target).hasClass('close')) {
                this.$searchbox.focus();
            } else {
                this.$button.focus();
            }
        });

        this.$menuInner.on('click', '.divider, .dropdown-header', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.options.liveSearch) {
                this.$searchbox.focus();
            } else {
                this.$button.focus();
            }
        });

        this.$menu.on('click', '.popover-title .close', () => {
            this.$button.click();
        });

        this.$searchbox.on('click', (e) => {
            e.stopPropagation();
        });

        this.$menu.on('click', '.actions-btn', (e) => {
            if (this.options.liveSearch) {
                this.$searchbox.focus();
            } else {
                this.$button.focus();
            }

            e.preventDefault();
            e.stopPropagation();

            if ($(e.currentTarget).hasClass('bs-select-all')) {
                this.selectAll();
            } else {
                this.deselectAll();
            }
        });

        this.$element.change(() => {
            this.render(false);
        });
    }


    focusFirstLi(e) {
        this.$lis.filter('.active').removeClass('active');
        timeit('post-search re-render'); // the selector is already optimized: 5000 -> 20 ms
        if (this.$searchbox.val()) {
            this.$lis.not('.hidden').not('.divider').not('.dropdown-header').eq(0).addClass('active').children('a').trigger('focus');
        }
        $(e.currentTarget).focus();
        timeit('post-search re-render');
    }


    hideEmptyOptgroups() {
        this.$lis.filter('.dropdown-header').each((i, el) => {
            let optgroup = $(el).data('optgroup');
            if (this.$lis.filter('[data-optgroup=' + optgroup + ']').not(el).not('.hidden').length === 0) {
                $(el).addClass('hidden');
                this.$lis.filter('[data-optgroup=' + optgroup + 'div]').addClass('hidden');
            }
        });
    }


    hideDividers() {
        let $lisVisible = this.$lis.not('.hidden');

        // hide divider if first or last visible, or if followed by another divider
        $lisVisible.each(function(index) {
            var $target = $(this);
            if ($target.hasClass('divider') &&
                    ($target.data('optgroup-index') === $lisVisible.first().data('optgroup-index') ||
                     $target.data('optgroup-index') === $lisVisible.last().data('optgroup-index') ||
                     $lisVisible.eq(index + 1).hasClass('divider'))) {
                $target.addClass('hidden');
            }
        });
    }


    toggleNoResults() {
        if (!this.$lis.not('.hidden').not('.no-results').length) {
            if (!!this.$noResults.parent().length) {
                this.$noResults.remove();
            }
            this.$noResults.html(this.options.noneResultsText).show();
            this.$menuInner.append(this.$noResults);
        } else if (!!this.$noResults.parent().length) {
            this.$noResults.remove();
        }
    }


    hideNonMatchedLis($searchBase, chunkIndex, e) {
        // add "hidden" class in chunks to unburden the main thread
        let chunkSize = 500;  // random size
        let maxChunks = Math.ceil($searchBase.length / chunkSize);
        let chunkStart = chunkIndex * chunkSize;
        let chunkStop = chunkStart + chunkSize;
        let chunkElems = $searchBase.slice(chunkStart, chunkStop);
        chunkElems.addClass('hidden');

        if (chunkIndex === (maxChunks - 1)) {
            timeit('apply-hidden');

            this.hideEmptyOptgroups();
            this.hideDividers();
            this.toggleNoResults();
            this.focusFirstLi(e);
        } else {
            this.hideLisTimeout = setTimeout(() => {
                this.hideNonMatchedLis($searchBase, chunkIndex + 1, e);
            }, 0); // push back execution to the end on the current event stack
        }
    }


    setLiveSearchListeners() {
        this.$button.on('click.dropdown.data-api touchstart.dropdown.data-api', () => {
            this.$menuInner.find('.active').removeClass('active');
            if (!!this.$searchbox.val()) {
                this.$searchbox.val('');
                this.$lis.not('.is-hidden').removeClass('hidden');
                if (!!this.$noResults.parent().length) this.$noResults.remove();
            }
            if (!this.multiple) this.$menuInner.find('.selected').addClass('active');
            setTimeout(() => {
                this.$searchbox.focus();
            }, 10);
        });

        this.$searchbox.on('click.dropdown.data-api focus.dropdown.data-api touchend.dropdown.data-api', (e) => {
            e.stopPropagation();
        });

        let debounceInterval = (this.findLis().length < 5000) ? 0 : 1000;
        this.$searchbox.on('input propertychange', require('debounce')((e) => {
            if (this.$searchbox.val()) {
                timeit('search');
                let _this = this;
                let $searchBase = this.$lis.not('.is-hidden').removeClass('hidden').filter(function(index) {
                    var $li = $(this);

                    // skip optgroup headers
                    if ($li.is('.dropdown-header')) {
                        return false;
                    }

                    if (_this.options.liveSearchNormalize) {
                        return $li.not(':a' + _this._searchStyle() + '("' + normalizeToBase(_this.$searchbox.val()) + '")').length === 1;
                    }
                    return $li.not(':' + _this._searchStyle() + '("' + _this.$searchbox.val() + '")').length === 1;
                });
                timeit('search');

                timeit('apply-hidden');
                clearTimeout(this.hideLisTimeout);
                this.hideNonMatchedLis($searchBase, 0, e);
            } else {
                this.$lis.not('.is-hidden').removeClass('hidden');
                if (!!this.$noResults.parent().length) {
                    this.$noResults.remove();
                }

                this.focusFirstLi(e);
            }
        }, debounceInterval));
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


    /**
     * Checks if the select3 is currently active.
     */
    isActive() {
        return this.$newElement.hasClass('open');
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
        this.$element.trigger('change');
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


    /**
     * The prototype of this function is bound to the keydown event, so
     * not every instance has it's own keydown handlers.
     */
    keydown(e) {
        let $target = $(e.currentTarget);
        let $parent = $target.is('input') ? $target.parent().parent() : $target.parent();
        // This is the current instance.
        let _this = $parent.data('this');

        let selector = ':not(.disabled, .hidden, .dropdown-header, .divider)';
        let keyCodeMap = {
            32: ' ', 48: '0', 49: '1', 50: '2', 51: '3', 52: '4', 53: '5', 54: '6', 55: '7', 56: '8', 57: '9', 59: ';',
            65: 'a', 66: 'b', 67: 'c', 68: 'd', 69: 'e', 70: 'f', 71: 'g', 72: 'h', 73: 'i', 74: 'j', 75: 'k', 76: 'l',
            77: 'm', 78: 'n', 79: 'o', 80: 'p', 81: 'q', 82: 'r', 83: 's', 84: 't', 85: 'u', 86: 'v', 87: 'w', 88: 'x',
            89: 'y', 90: 'z', 96: '0', 97: '1', 98: '2', 99: '3', 100: '4', 101: '5', 102: '6', 103: '7', 104: '8',
            105: '9',
        };

        if (_this.options.liveSearch) $parent = $target.parent().parent();
        if (_this.options.container) $parent = _this.$menu;
        let $items = $('[role=menu] li', $parent);
        let isActive = _this.isActive();

        if (!isActive && (e.keyCode >= 48 && e.keyCode <= 57 || e.keyCode >= 96 && e.keyCode <= 105 || e.keyCode >= 65 && e.keyCode <= 90)) {
            if (!_this.options.container) {
                _this.setSize();
                _this.$menu.parent().addClass('open');
                isActive = true;
            } else {
                _this.$button.trigger('click');
            }
            _this.$searchbox.focus();
            return;
        }

        if (_this.options.liveSearch) {
            if (/(^9$|27)/.test(e.keyCode.toString(10)) && isActive && _this.$menu.find('.active').length === 0) {
                e.preventDefault();
                _this.$menu.parent().removeClass('open');
                if (_this.options.container) _this.$newElement.removeClass('open');
                _this.$button.focus();
            }
            // $items contains li elements when liveSearch is enabled
            $items = $('[role=menu] li' + selector, $parent);
            if (!$target.val() && !/(38|40)/.test(e.keyCode.toString(10))) {
                if ($items.filter('.active').length === 0) {
                    $items = _this.$menuInner.find('li');
                    if (_this.options.liveSearchNormalize) {
                        $items = $items.filter(':a' + _this._searchStyle() + '(' + normalizeToBase(keyCodeMap[e.keyCode]) + ')');
                    } else {
                        $items = $items.filter(':' + _this._searchStyle() + '(' + keyCodeMap[e.keyCode] + ')');
                    }
                }
            }
        }

        if (!$items.length) return;

        if (/(38|40)/.test(e.keyCode.toString(10))) {
            let index = $items.index($items.find('a').filter(':focus').parent());
            let first = $items.filter(selector).first().data('optgroup-index');
            let last = $items.filter(selector).last().data('optgroup-index');
            let next = $items.eq(index).nextAll(selector).eq(0).data('optgroup-index');
            let prev = $items.eq(index).prevAll(selector).eq(0).data('optgroup-index');
            let nextPrev = $items.eq(next).prevAll(selector).eq(0).data('optgroup-index');

            if (_this.options.liveSearch) {
                $items.each(function(i, el) {
                    if (!$(el).hasClass('disabled')) {
                        $(el).data('index', i);
                    }
                });
                index = $items.index($items.filter('.active'));
                first = $items.first().data('index');
                last = $items.last().data('index');
                next = $items.eq(index).nextAll().eq(0).data('index');
                prev = $items.eq(index).prevAll().eq(0).data('index');
                nextPrev = $items.eq(next).prevAll().eq(0).data('index');
            }

            let prevIndex = $target.data('prevIndex');

            if (e.keyCode === 38) {
                if (_this.options.liveSearch) index--;
                if (index !== nextPrev && index > prev) index = prev;
                if (index < first) index = first;
                if (index === prevIndex) index = last;
            } else if (e.keyCode === 40) {
                if (_this.options.liveSearch) index++;
                if (index === -1) index = 0;
                if (index !== nextPrev && index < next) index = next;
                if (index > last) index = last;
                if (index === prevIndex) index = first;
            }

            $target.data('prevIndex', index);

            if (!_this.options.liveSearch) {
                $items.eq(index).children('a').focus();
            } else {
                e.preventDefault();
                if (!$target.hasClass('dropdown-toggle')) {
                    $items.removeClass('active').eq(index).addClass('active').children('a').focus();
                    $target.focus();
                }
            }
        } else if (!$target.is('input')) {
            let count, prevKey;
            let keyIndex = [];

            $items.each(function(i, el) {
                if (!$(el).hasClass('disabled')) {
                    if ($.trim($(el).children('a').text().toLowerCase()).substring(0, 1) === keyCodeMap[e.keyCode]) {
                        keyIndex.push($(el).data('optgroup-index'));
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
        if ((/(13|32)/.test(e.keyCode.toString(10)) || (/(^9$)/.test(e.keyCode.toString(10)) && _this.options.selectOnTab)) && isActive) {
            if (!/(32)/.test(e.keyCode.toString(10))) e.preventDefault();
            if (!_this.options.liveSearch) {
                let elem = $(':focus');
                elem.click();
                // Bring back focus for multiselects
                elem.focus();
                // Prevent screen from scrolling if the user hit the spacebar
                e.preventDefault();
                // Fixes spacebar selection of dropdown items in FF & IE
                $(document).data('spaceSelect', true);
            } else if (!/(32)/.test(e.keyCode.toString(10))) {
                _this.$menuInner.find('.active a').click();
                $target.focus();
            }
            $(document).data('keycount', 0);
        }

        if ((/(^9$|27)/.test(e.keyCode.toString(10)) && isActive && (_this.multiple || _this.options.liveSearch)) || (/(27)/.test(e.keyCode.toString(10)) && !isActive)) {
            _this.$menu.parent().removeClass('open');
            if (_this.options.container) _this.$newElement.removeClass('open');
            _this.$button.focus();
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

        this.$element.off('.bs.select').removeData('select3').removeClass('bs-select-hidden select3');
    }

}


Select3.VERSION = '0.1.0';
Select3.DEFAULTS = {
    noneSelectedText: 'Nothing selected',
    noneResultsText: 'No results',
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
    dropupForce: false,
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
    let chain = this.each(function(i, el) {
        let $el = $(el);
        if ($el.is('select')) {
            let data = $el.data('select3');
            let options = typeof _option === 'object' && _option;

            if (!data) {
                let config = $.extend({}, Select3.DEFAULTS, $.fn.select3.defaults || {}, $el.data(), options);
                config.template = $.extend({}, Select3.DEFAULTS.template, ($.fn.select3.defaults ? $.fn.select3.defaults.template : {}), $el.data().template, options.template);
                $el.data('select3', (data = new Select3(el, config, _event)));
            } else if (options) {
                for (let _i in options) {
                    if (options.hasOwnProperty(_i)) {
                        data.options[i] = options[_i];
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
    // No inspection.
    if (typeof value !== 'undefined') {
        return value;
    }
    return chain;
};


// Only bind the keydown event once; not for every instance.
$(document).data('keycount', 0)
    .on('keydown.bs.select', '.select3 [data-toggle=dropdown], .select3 [role="menu"], .bs-searchbox input', Select3.prototype.keydown)
    .on('focusin.modal', '.select3 [data-toggle=dropdown], .select3 [role="menu"], .bs-searchbox input', (e) => {
        e.stopPropagation();
    });
