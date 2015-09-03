Delta     = require('rich-text/lib/delta')
Parchment = require('parchment')


class Editor extends Parchment.Container
  constructor: (domNode) ->
    super(domNode)
    this.ensureChild()
    this.enable()
    @delta = this.getDelta()
    @observer = new MutationObserver(this.update.bind(this))
    @observer.observe(@domNode,
      attributes: true
      characterData: true
      childList: true
      subtree: true
    )

  deleteAt: (index, length) ->
    [first, firstOffset] = @children.find(index)
    [last, lastOffset] = @children.find(index + length)
    super(index, length)
    if (last? && first != last && firstOffset > 0)
      lastChild = first.children.tail
      last.moveChildren(first)
      last.remove()
      lastChild.merge() if lastChild?
    this.ensureChild()

  enable: (enabled = true) ->
    @domNode.setAttribute('contenteditable', enabled)

  ensureChild: ->
    if @children.length == 0
      this.appendChild(Parchment.create('block'))

  findPath: (index) ->
    if index >= this.getLength()
      return []
    else
      return super(index).slice(1)

  getDelta: ->
    return this.getDescendants(Parchment.Block).reduce((delta, child) =>
      return delta.concat(child.getDelta())
    , new Delta())

  onUpdate: (delta) ->

  # Prevent document removal
  remove: ->
    @children.forEach((child) ->
      child.remove()
    )

  update: (mutations = @observer.takeRecords()) ->
    return new Delta() unless mutations.length > 0
    oldDelta = @delta
    this.build()
    @delta = this.getDelta()
    change = oldDelta.diff(@delta)
    this.onUpdate(change) if change.length() > 0
    @observer.takeRecords()  # Prevent changes from rebuilds
    return change


module.exports = Editor