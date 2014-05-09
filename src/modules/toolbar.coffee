_     = require('lodash')
DOM   = require('../dom')
Utils = require('../utils')


class Toolbar
  @DEFAULTS:
    container: null

  @formats:
    BUTTON  : { 'bold', 'image', 'italic', 'link', 'markup', 'strike', 'underline' }
    LINE    : { 'align' }
    SELECT  : { 'align', 'background', 'color', 'font', 'size' }
    TOOLTIP : { 'image', 'link', 'markup' }

  constructor: (@quill, @options) ->
    throw new Error('container required for toolbar', @options) unless @options.container?
    @container = if _.isString(@options.container) then document.querySelector(@options.container) else @options.container
    @inputs = {}
    @preventUpdate = false
    @triggering = false
    _.each(@quill.options.formats, (format) =>
      return if Toolbar.formats.TOOLTIP[format]?
      this.initFormat(format, (range, value) =>
        return if @triggering
        if range.isCollapsed()
          @quill.prepareFormat(format, value)
        else if Toolbar.formats.LINE[format]?
          @quill.formatLine(range, format, value, 'user')
        else
          @quill.formatText(range, format, value, 'user')
        this.setActive(format, value)
      )
    )
    @quill.on(@quill.constructor.events.SELECTION_CHANGE, _.bind(this.updateActive, this))
    DOM.addClass(@container, 'sc-toolbar-container')
    DOM.addClass(@container, 'ios') if DOM.isIOS()  # Fix for iOS not losing hover state after click
    if DOM.isIE(11) or DOM.isIOS()
      DOM.addEventListener(@container, 'mousedown', =>
        # IE destroys selection by default when we click away
        # Also fixes bug in iOS where preformating prevents subsequent typing
        return false
      )

  initFormat: (format, callback) ->
    selector = ".sc-#{format}"
    if Toolbar.formats.SELECT[format]?
      selector = "select#{selector}"
      eventName = 'change'
    else
      eventName = 'click'
    input = @container.querySelector(selector)
    return unless input?
    @inputs[format] = input
    DOM.addEventListener(input, eventName, =>
      value = if eventName == 'change' then DOM.getSelectValue(input) else !DOM.hasClass(input, 'sc-active')
      @preventUpdate = true
      @quill.focus()
      range = @quill.getSelection()
      callback(range, value) if range?
      @preventUpdate = false
      return true
    )

  setActive: (format, value) ->
    input = @inputs[format]
    return unless input?
    if input.tagName == 'SELECT'
      @triggering = true
      selectValue = DOM.getSelectValue(input)
      value = '' if _.isArray(value)
      if value != selectValue
        if value?
          DOM.selectOption(input, value)
        else
          DOM.resetSelect(input)
      @triggering = false
    else
      DOM.toggleClass(input, 'sc-active', value or false)

  updateActive: (range) ->
    return unless range? and !@preventUpdate
    activeFormats = this._getActive(range)
    _.each(@inputs, (input, format) =>
      this.setActive(format, activeFormats[format])
      return true
    )

  _getActive: (range) ->
    leafFormats = this._getLeafActive(range)
    lineFormats = this._getLineActive(range)
    return _.defaults(leafFormats, lineFormats)

  _getLeafActive: (range) ->
    if range.isCollapsed()
      start = Math.max(0, range.start - 1)
      contents = @quill.getContents(start, range.end)
    else
      contents = @quill.getContents(range)
    formatsArr = _.map(contents.ops, 'attributes')
    return this._intersectFormats(formatsArr)

  _getLineActive: (range) ->
    formatsArr = []
    [firstLine, offset] = @quill.editor.doc.findLineAt(range.start)
    [lastLine, offset] = @quill.editor.doc.findLineAt(range.end)
    lastLine = lastLine.next if lastLine? and lastLine == firstLine
    while firstLine? and firstLine != lastLine
      formats = { 'align': firstLine.formats['align'] }    # TODO fix when we have more line attributes
      formatsArr.push(firstLine.formats)
      firstLine = firstLine.next
    return this._intersectFormats(formatsArr)

  _intersectFormats: (formatsArr) ->
    return _.reduce(formatsArr.slice(1), (activeFormats, formats) ->
      activeKeys = _.keys(activeFormats)
      formatKeys = _.keys(formats)
      intersection = _.intersection(activeKeys, formatKeys)
      missing = _.difference(activeKeys, formatKeys)
      added = _.difference(formatKeys, activeKeys)
      _.each(intersection, (name) ->
        if Toolbar.formats.SELECT[name]?
          if _.isArray(activeFormats[name])
            activeFormats[name].push(formats[name]) if _.indexOf(activeFormats[name], formats[name]) < 0
          else if activeFormats[name] != formats[name]
            activeFormats[name] = [activeFormats[name], formats[name]]
      )
      _.each(missing, (name) ->
        if Toolbar.formats.BUTTON[name]?
          delete activeFormats[name]
        else if Toolbar.formats.SELECT[name]? and !_.isArray(activeFormats[name])
          activeFormats[name] = [activeFormats[name]]
      )
      _.each(added, (name) ->
        activeFormats[name] = [formats[name]] if Toolbar.formats.SELECT[name]?
      )
      return activeFormats
    , formatsArr[0] or {})


module.exports = Toolbar
