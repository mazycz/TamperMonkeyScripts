// ==UserScript==
// @name         Chilli Gallery
// @namespace    chilli
// @version      0.1.1
// @description  lets make chilli more hot!
// @author       mazy.cz
// @match        https://helpdesk.definity.cz/*
// @grant        GM_addStyle
// @grant        unsafeWindow
// @grant        GM_updatingEnabled
// @grant        GM_xmlhttpRequest
// @require      https://raw.githubusercontent.com/mihaifm/linq/master/linq.js
// ==/UserScript==

var $ = jQuery;
(function () {
    $("head").append(`<link href="https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css" rel="stylesheet" type="text/css">`);
    var styles = [
        "https://raw.githubusercontent.com/mazycz/Test001Scripts/master/Styles/ChilliDark.css",
        "https://raw.githubusercontent.com/mazycz/Test001Scripts/master/Styles/ChilliGallery.css"
    ];

    $(styles).each((i, e) => {
        GM_xmlhttpRequest({
            method: "GET",
            url: `${e}?` + Math.random(),
            onload: function (response) {
                var css = response.responseText;
                GM_addStyle(css);
            }
        });
    });    

    // pridani tlacitka pro schovani / zobrazeni deniku udalosti
    $(".title-bar-actions > .contextual").prepend("<a href='javascript:void(0);' onclick='custShowHideJournal();' class='icon'><i class='fa fa-history'></i>&nbsp;Zobrazit / Schovat denik</a>");

    var atts = $(".attachments a:not(.delete)");
    for (var i = 0; i < atts.length; i++) {
        var attPath = $(atts[i]).attr("href").toLowerCase();
        if (/\.(?:jpg|jpeg|gif|png|bmp)$/i.test(attPath)) {
            //$(atts[i]).attr("href", "javascript:void(0)").attr("onclick", `console.log('${attPath}')`);
            //$(atts[i]).attr("class", "image icon icon-attachment");
            $(atts[i]).addClass("image");
            var t = $(atts[i]).html();
            $(atts[i]).html(`${t} <img source='${t}' alt=''>`);
        }
    }
    var RS = {};
    $.fn.rebind = function (eventType, handler) {
        this.unbind(eventType);
        this.bind(eventType, function (e) { handler(e); });
        return this;
    };
    function getSelector(ele) {
        var element = ele[0];
        // Get the xpath for this element.
        // This was easier than calculating the DOM using jQuery, for now.
        var xpath = '';
        for (; element && element.nodeType == 1; element = element.parentNode) {
            var id = $(element.parentNode).children(element.tagName).index(element) + 1;
            var strId = '';
            if (id > 1) {
                strId = '[' + id + ']';
            }
            else {
                strId = '';
            }
            xpath = '/' + element.tagName.toLowerCase() + strId + xpath;
        }

        // Return CSS selector for the calculated xpath
        return xpath
            .substr(1)
            .replace(/\//g, ' > ')
            .replace(/\[(\d+)\]/g, function ($0, i) { return ':nth-of-type(' + i + ')'; });
    };
    function isNullOrEmpty(val) {
        return (val === null || val === undefined || val.length == 0);
    }

    var MazyGalleryImage = /** @class */ (function () {
        function MazyGalleryImage(gal, ele) {
            var _this = this;
            this.initEvents = function () {
                var self = _this;
                $(_this.ele).rebind('click', (function (e) {
                    e.preventDefault();
                    self.gallery.showImage(self);
                }));
            };
            this.ele = ele;
            this.gallery = gal;
            this.imageId = $(ele).attr('image-id');
            this.src = $(ele).attr('href');
            if (isNullOrEmpty(this.imageId)) {
                this.imageId = this.src;
            }
            this.title = $(this.ele).attr('title');
            this.imageInfoUrl = $(this.ele).attr('image-info-url');
            if (isNullOrEmpty(this.title)) {
                this.title = '&nbsp;';
            }
            if ($(ele).find('> img').length > 0) {
                var attrs = $(ele).find('> img')[0].attributes;
                this.attributes = {};
                for (var i = 0; i < attrs.length; i++) {
                    var attr = attrs[i];
                    if (attr.name.startsWith('data-')) {
                        var name = attr.name.replace('data-', '');
                        var value = attr.value;
                        this.attributes[name] = value;
                    }
                }
            }
            this.initEvents();
        }
        MazyGalleryImage.prototype.initGalleryEvent = function () {
            var self = this;
            $(this.gallery.envelope).find('a.gallery-image[image-id="' + this.imageId + '"]').rebind('click', (function (e) {
                e.preventDefault();
                self.gallery.showImage(self);
            }));
        };
        return MazyGalleryImage;
    }());
    var MazyGallery = /** @class */ (function () {
        function MazyGallery(ele, options) {
            var _this = this;
            this.isShown = false;
            this.isShownExpanded = false;
            this.isFromModal = null;
            this.options = {
                galleryPosition: 'none',
                infiniteGallery: false,
                width: '80%',
                mainImageWidth: '100%',
                imageInfo: 'hover',
                rightSectionWidth: '7',
                rightSectionContent: null,
                onImageShow: null,
                uniqueGallery: false
            };
            this.LoadImages = function () {
                _this.images = new Array();
                var images = $(_this.ele.selector).find('.image');
                for (var i = 0; i < images.length; i++) {
                    var img = new MazyGalleryImage(_this, $(images[i]));
                    if (_this.options.uniqueGallery) {
                        if (Enumerable.from(_this.images).any(function (x) { return x.imageId == img.imageId; }) == false) {
                            _this.images.push(img);
                        }
                    }
                    else {
                        _this.images.push(img);
                    }
                }
            };
            this.ReloadImages = function () {
                _this.LoadImages();
                if (_this.isShown == false) {
                    return;
                }
                _this.fillGalleryImages();
            };
            this.showFirstImage = function () {
                var img = Enumerable.from(_this.images).firstOrDefault();
                if (img != null) {
                    _this.showImage(img);
                }
            };
            this.showImageById = function (id) {
                var img = Enumerable.from(_this.images).singleOrDefault(function (x) { return x.imageId == id + ''; });
                if (img != null) {
                    _this.showImage(img);
                }
            };
            this.showImage = function (img) {
                if (_this.isShown == false) {
                    _this.displayEnvelope();
                }
                _this.envelope.find('.image-info').hide();
                _this.envelope.find('.main-image').html('<img src="' + img.src + '" image-id="' + img.imageId + '" />');
                _this.envelope.find('.gallery-images > a').removeClass('active');
                _this.envelope.find('.gallery-images > a[image-id="' + img.imageId + '"]').addClass('active');
                _this.isShown = true;
                _this.prepareImageInfo(img.imageInfoUrl);
                if (isNullOrEmpty(img.imageInfoUrl)) {
                    _this.envelope.find('.gallery-info').hide();
                }
                else {
                    _this.envelope.find('.gallery-info').show();
                }
                _this.scrollImage(img);
                if (_this.options.onImageShow != null) {
                    _this.options.onImageShow(img);
                }
            };
            this.displayEnvelope = function () {
                var self = _this;
                if (_this.envelope == null) {
                    $('body').append('<div id="' + _this.Id + '-mazygallery-envelope" class="mazy-gallery-modal"></div>');
                    $('#' + _this.Id + '-mazygallery-envelope').append(_this.getEnvelopeHtml());
                    _this.envelope = $('#' + _this.Id + '-mazygallery-envelope');
                    _this.fillGalleryImages();
                }
                _this.envelope.show();
                _this.setEnvelopeSizes();
                _this.envelope.find('.gallery-close').rebind('click', function (e) {
                    self.hideEnvelope();
                });
                _this.envelope.find('.gallery-download').rebind('click', function (e) {
                    var url = _this.envelope.find('.main-image img').attr('src');
                    var fileName = url.substring(url.lastIndexOf('/') + 1);
                    var extension = fileName.indexOf(".") > 0 ? fileName.substring(url.lastIndexOf(".")) : ".jpg";
                    var link = document.createElement('a');
                    link.href = url;
                    link.download = fileName + extension;
                    document.body.appendChild(link);
                    link.click();
                });
                _this.envelope.rebind('click', function (e) {
                    if ($(e.target).hasClass('mazy-gallery-modal')) {
                        self.hideEnvelope();
                    }
                });
                $(document).off("keydown").on("keydown", function (e) {
                    if (self.isShown) {
                        if (e.keyCode == 37) {
                            self.showNextImage(-1);
                        }
                        if (e.keyCode == 39) {
                            self.showNextImage(1);
                        }
                        if (e.keyCode == 27) {
                            if (self.isShown) {
                                self.hideEnvelope();
                            }
                            if (self.isShownExpanded) {
                                self.hideExpanded();
                            }
                        }
                    }
                });
                _this.envelope.find('.gallery-previous-image').rebind('click', function (e) {
                    self.showNextImage(-1);
                });
                _this.envelope.find('.gallery-next-image').rebind('click', function (e) {
                    self.showNextImage(1);
                });
                _this.envelope.find('.gallery-expand').rebind('click', function (e) {
                    self.showImageExpanded(self.getCurrentImage());
                });
                if (_this.isFromModal != null) {
                    $(_this.isFromModal).data("bs.modal").options.keyboard = false;
                    $(_this.isFromModal).data("bs.modal").options.backdrop = false;
                    $(_this.isFromModal).off('keydown.dismiss.bs.modal');
                }
                _this.isShown = true;
            };
            this.GetUniqueId = function () {
                var prefix = "mazygallery_";
                var index = 0;
                while ($('#' + prefix + "" + index).length != 0) {
                    index = index + 1;
                }
                return prefix + "" + index;
            };
            this.destroy = function () {
                if (_this.envelope != null && _this.envelope != undefined) {
                    _this.envelope.remove();
                }
                if (_this.expandedEnvelope != null && _this.expandedEnvelope != undefined) {
                    _this.expandedEnvelope.remove();
                }
                $('#' + _this.Id + '-mazygallery-envelope').remove();
                _this.images = null;
                galleries[getSelector($(_this.ele))] = null;
            };
            this.ele = ele;
            $.extend(this.options, options);
            this.Id = this.GetUniqueId();
            if (isNullOrEmpty($(this.ele).attr('id'))) {
                $(this.ele).attr('id', this.Id);
            }
            else {
                this.Id = $(this.ele).attr('id');
            }
            this.LoadImages();
            if ($(ele).closest('.modal-dialog').length > 0) {
                this.isFromModal = $(ele).closest('.modal-dialog').parent();
            }
        }
        MazyGallery.prototype.scrollImage = function (img) {
            if (this.options.galleryPosition == 'bottom') {
                var imgIdx = this.envelope.find('.gallery-images > a').index(this.envelope.find('.gallery-images > a[image-id="' + img.imageId + '"]'));
                var elHeight = this.envelope.find('.gallery-images > a[image-id="' + img.imageId + '"]').width();
                var windowHeight = this.envelope.find('.gallery-images').width();
                var offset = (windowHeight / elHeight) * imgIdx;
                this.envelope.find('.gallery-images').animate({
                    scrollLeft: offset
                }, 1);
            }
            else {
                //console.log('Not implemented');
            }
        };
        MazyGallery.prototype.showNextImage = function (increment) {
            var currImgId = this.envelope.find('.main-image > img').attr('image-id');
            var imagesList = this.envelope.find('.gallery-images > a[image-id]');
            var index = imagesList.index(this.envelope.find('.gallery-images > a[image-id="' + currImgId + '"]'));
            index = index + increment;
            if (index < 0) {
                if (this.options.infiniteGallery) {
                    index = imagesList.length - 1;
                }
                else {
                    index = 0;
                }
            }
            if (index >= imagesList.length) {
                if (this.options.infiniteGallery) {
                    index = 0;
                }
                else {
                    index = imagesList.length - 1;
                }
            }
            var img = this.images[index];
            this.showImage(img);
            if (this.isShownExpanded) {
                this.showImageExpanded(img);
            }
        };
        MazyGallery.prototype.prepareImageInfo = function (imageInfoUrl) {
            if (isNullOrEmpty(imageInfoUrl))
                return;
            var self = this;
            ajaxpq.enqueue({
                priority: 6,
                queueName: "gallery",
                url: imageInfoUrl,
                type: "POST",
                success: function (result) {
                    if (self.options.imageInfo == 'hover') {
                        self.envelope.find('.gallery-info').qtip({
                            content: {
                                text: result,
                                type: "html"
                            },
                            position: {
                                my: 'right top',
                                at: 'right bottom'
                            },
                            style: 'qtip-dark qtip-shadow mazy-gallery-qtip'
                        });
                    }
                    if (self.options.imageInfo == 'pin') {
                        self.envelope.find('.image-info').html(result);
                        self.envelope.find('.image-info').show();
                    }
                }
            });
        };
        MazyGallery.prototype.hideEnvelope = function () {
            if (this.isFromModal != null) {
                $(this.isFromModal).data("bs.modal").options.keyboard = true;
                $(this.isFromModal).data("bs.modal").options.backdrop = true;
                $(this.isFromModal).data("bs.modal").escape();
            }
            this.envelope.hide();
            this.isShown = false;
        };
        MazyGallery.prototype.setEnvelopeSizes = function () {
            var windowWidth = window.innerWidth;
            var windowHeight = window.innerHeight;
            this.envelope.find('.gallery-content').css('width', this.options.width);
            if (this.options.galleryPosition == 'none' || isNullOrEmpty(this.options.galleryPosition)) {
            }
            if (this.options.galleryPosition == 'left') {
                var boxMargin = parseInt(this.envelope.find('.gallery-content').css('margin-top').replace('px', ''));
                boxMargin += parseInt(this.envelope.find('.gallery-content').css('margin-bottom').replace('px', ''));
                windowHeight = windowHeight - boxMargin;
                $(this.envelope).find('.gallery-images').height(windowHeight + 'px');
                var galleryMove = this.envelope.find('.gallery-move').outerHeight(true);
                $(this.envelope).find('.main-image').height((windowHeight - galleryMove) + 'px');
            }
            if (this.options.galleryPosition == 'bottom') {
                var mainImageMargins = parseInt($(this.envelope).find('.main-image').css('margin-top').replace('px', ''));
                var galleryImagesMargins = parseInt($(this.envelope).find('.gallery-images').css('margin-top').replace('px', ''));
                galleryImagesMargins += parseInt($(this.envelope).find('.gallery-images').css('margin-bottom').replace('px', ''));
                var boxMargin = parseInt(this.envelope.find('.gallery-content').css('margin-top').replace('px', ''));
                var boxPadding = parseInt(this.envelope.find('.gallery-content').css('padding-top').replace('px', ''));
                boxPadding += parseInt(this.envelope.find('.gallery-content').css('padding-bottom').replace('px', ''));
                windowHeight = windowHeight - mainImageMargins - galleryImagesMargins - boxPadding - boxMargin - 50;
                var multiplier = this.images.length == 0 ? 1 : 0.85;
                $(this.envelope).find('.main-image').height(windowHeight * multiplier + 'px');
                $(this.envelope).find('.gallery-images > a.gallery-image').height(windowHeight * (1 - multiplier) + 'px');
                var galleryPrevNext = parseInt(this.envelope.find('.gallery-previous-image').css('margin-bottom').replace('px', ''));
                windowHeight = windowHeight - galleryPrevNext;
                $(this.envelope).find('.gallery-previous-image').height(windowHeight * multiplier + 'px').css('line-height', windowHeight * multiplier + 'px');
                $(this.envelope).find('.gallery-next-image').height(windowHeight * multiplier + 'px').css('line-height', windowHeight * multiplier + 'px');
            }
        };
        MazyGallery.prototype.getEnvelopeHtml = function () {
            var retHtml = '';
            if (this.options.galleryPosition == 'none' || isNullOrEmpty(this.options.galleryPosition)) {
            }
            var rightSectionHtml = this.options.rightSectionContent == null ? '' : $(this.options.rightSectionContent)[0].outerHTML;
            if ($(this.options.rightSectionContent).length == 1) {
                $(this.options.rightSectionContent).remove();
            }
            if (this.options.galleryPosition == 'left') {
                retHtml += "\n <div class=\"gallery-content gallery-type-left\">\n <div class=\"gallery-controls\">\n <span class=\"gallery-info\" title=\"History\"><i class=\"fa fa-history\" id=\"ImageHistory\" onclick=\"prdSummaryTab.showHistory()\"/></span>\n <span class=\"gallery-info\" title=\"Information\"><i class=\"fa fa-info\" /></span>\n <span class=\"gallery-expand\" title=\"Expand\"><i class=\"fa fa-external-link\" /></span>\n <span class=\"gallery-download\" title=\"Download\"><i class=\"fa fa-download\" /></span>\n <span class=\"gallery-close\" title=\"Close\"><i class=\"fa fa-close\" /></span>\n </div>\n <div class=\"gallery-content-box row\">\n <div class=\"col-lg-12\">\n <div class=\"col-lg-3 gallery-images\">\n </div>\n <div class=\"col-lg-" + this.options.rightSectionWidth + " right-section\">\n                                <div class=\"gallery-move\">\n                                    <span class=\"gallery-previous-image fa fa-arrow-left\"></span>\n                                    <span class=\"gallery-next-image fa fa-arrow-right\"></span>\n                                </div>\n                                <div class=\"main-image\" style=\"width:" + this.options.mainImageWidth + "\"></div>\n                            </div>\n                            " + rightSectionHtml + "\n                        </div>\n                    </div>\n                </div>";
            }
            if (this.options.galleryPosition == 'bottom') {
                retHtml += "\n                <div class=\"gallery-content gallery-type-bottom\">\n                    <div class=\"gallery-controls\">\n                        <span class=\"gallery-info\" title=\"History\"><i class=\"fa fa-history\" id=\"ImageHistory\" onclick=\"prdSummaryTab.showHistory()\"/></span>\n <span class=\"gallery-info\" title=\"Information\"><i class=\"fa fa-info\" /></span>\n <span class=\"gallery-expand\" title=\"Expand\"><i class=\"fa fa-external-link\" /></span>\n <span class=\"gallery-download\" title=\"Download\"><i class=\"fa fa-download\" /></span>\n <span class=\"gallery-close\" title=\"Close\"><i class=\"fa fa-close\" /></span>\n                    </div>\n                    <div class=\"gallery-content-box\">\n                    <span class=\"gallery-next-image fa fa-arrow-right\"></span>\n                    <span class=\"gallery-previous-image fa fa-arrow-left\"></span>\n                    <div class=\"main-image\"></div>\n                    <div class=\"gallery-images\"></div>\n                    </div>\n                </div>";
            }
            return retHtml;
        };
        MazyGallery.prototype.fillGalleryImages = function () {
            this.envelope.find('.gallery-images').html('');
            for (var i = 0; i < this.images.length; i++) {
                if (this.options.galleryPosition == 'bottom') {
                    this.envelope.find('.gallery-images').append('<a class="gallery-image" image-id="' + this.images[i].imageId + '"><img src="' + this.images[i].src + '" /></div>');
                }
                if (this.options.galleryPosition == 'left') {
                    this.envelope.find('.gallery-images').append('<a class="gallery-image" image-id="' + this.images[i].imageId + '"><img src="' + this.images[i].src + '" /><span>' + this.images[i].title + '</span></div>');
                }
                this.images[i].initGalleryEvent();
            }
        };
        MazyGallery.prototype.showImageExpanded = function (img) {
            if (this.isShownExpanded) {
                this.hideExpanded();
            }
            var self = this;
            var docHeight = $(document).height();
            $('body').append('<div id="' + this.Id + '-mazygallery-envelope-expanded" class="mazy-gallery-modal-expanded" style="display:none"></div>');
            $('#' + this.Id + '-mazygallery-envelope-expanded').append("\n            <div class=\"image\">\n                <img src=\"" + img.src + "\" />\n            </div>\n            ");
            this.expandedEnvelope = $('#' + this.Id + '-mazygallery-envelope-expanded');
            this.envelope.hide();
            this.expandedEnvelope.css('height', docHeight + 'px');
            this.expandedEnvelope.show();
            this.isShownExpanded = true;
            if (this.envelope.offset().top == 0) {
                this.expandedEnvelope.css('top', (-1 * (this.expandedEnvelope.offset().top)) + 'px');
            }
            else {
                this.expandedEnvelope.css('top', ((this.envelope.offset().top)) + 'px');
            }
            this.expandedEnvelope.rebind('click', function (e) {
                self.hideExpanded();
            });
        };
        MazyGallery.prototype.hideExpanded = function () {
            this.expandedEnvelope.hide();
            this.expandedEnvelope.remove();
            this.envelope.show();
            this.isShownExpanded = false;
            this.isShown = true;
        };
        MazyGallery.prototype.getCurrentImage = function () {
            var currImgId = this.envelope.find('.main-image > img').attr('image-id');
            var currImg = Enumerable.from(this.images).singleOrDefault(function (x) { return x.imageId == currImgId; });
            return currImg;
        };
        return MazyGallery;
    }());
    var galleries = {};
    $.fn.extend({

        mazygallery: function (options) {
            if (galleries[getSelector($(this))] == null) {
                var gal = new MazyGallery($(this), options);
                galleries[getSelector($(this))] = gal;
                return gal;
            }
            return galleries[getSelector($(this))];
        },
        mazygalleryDeleteAll: function () {
            $.each(galleries, function (k, v) {
                if (v != null) {
                    v.destroy();
                }
            });
            galleries = {};
        }
    });

    var gal = $('.attachments').mazygallery({
        galleryPosition: 'bottom',
        width: '90%',
        mainImageWidth: '90%',
        showImageInfo: true,
        infiniteGallery: true
    });
})();

function custShowHideJournal() {
    var journalItems = $("#history div.journal:not(.has-notes)");
    if (journalItems.length == 0) {
        return;
    }

    if ($(journalItems[0]).is(":visible")) {
        $(journalItems).hide();
    } else {
        $(journalItems).show();
    }
}

if (!unsafeWindow.custShowHideJournal) {
    unsafeWindow.custShowHideJournal = custShowHideJournal;
    custShowHideJournal();
}