<?php
$emojis = ['🗓️', '🍽️', '🍿', '🧭', '🏖️', '🍷', '🎶', '🏔️', '🛶', '🎉', '☕', '🍕'];
$ideas = ['Next Dinner Out', 'Weekend Trip Ideas', 'Next Movie Night', 'Brunch Spot', 'Summer Getaway'];
?>
<div class="mx-auto max-w-xl">
  <?= page_header($plan ? 'Edit plan' : 'Start a plan', 'Shared plans', $plan ? null : 'Give it a name, then add options from the site and let everyone vote.') ?>
  <form method="post" action="/plans/save" class="space-y-6">
    <?= csrf_field() ?>
    <?php if ($plan): ?><input type="hidden" name="id" value="<?= h($plan['id']) ?>"><?php endif ?>
    <?php if ($rec): ?><input type="hidden" name="rec" value="<?= h($rec) ?>"><?php endif ?>
    <div>
      <label class="label" for="title">Name it</label>
      <input id="title" name="title" required value="<?= h($plan['title'] ?? '') ?>" placeholder="Next Dinner Out" class="field py-3 text-[17px]" list="plan-ideas" <?= $plan ? '' : 'autofocus' ?>>
      <datalist id="plan-ideas"><?php foreach ($ideas as $i): ?><option value="<?= $i ?>"><?php endforeach ?></datalist>
    </div>
    <fieldset>
      <legend class="label">Pick an emoji</legend>
      <div class="flex flex-wrap gap-2">
        <?php foreach ($emojis as $i => $e): $checked = $plan ? $plan['emoji'] === $e : $i === 0; ?>
        <label class="cursor-pointer">
          <input type="radio" name="emoji" value="<?= $e ?>" <?= $checked ? 'checked' : '' ?> class="peer sr-only">
          <span class="flex size-11 items-center justify-center rounded-xl border border-line bg-raised text-xl transition peer-checked:border-gold/60 peer-checked:bg-gold/10 peer-focus-visible:ring-2 peer-focus-visible:ring-ink/20"><?= $e ?></span>
        </label>
        <?php endforeach ?>
      </div>
    </fieldset>
    <div>
      <label class="label" for="target_date">When? <span class="font-normal text-faint">(optional)</span></label>
      <input id="target_date" type="date" name="target_date" value="<?= h($plan['target_date'] ?? '') ?>" class="field">
    </div>
    <div>
      <label class="label" for="description">Details <span class="font-normal text-faint">(optional)</span></label>
      <textarea id="description" name="description" rows="3" placeholder="Saturday the 8th-ish. Somewhere we can actually hear each other." class="field"><?= h($plan['description'] ?? '') ?></textarea>
    </div>
    <div class="flex flex-wrap gap-3">
      <button class="btn-primary px-8 py-3"><?= $plan ? 'Save' : 'Create plan' ?></button>
      <a href="<?= $plan ? '/plans/' . h($plan['id']) : '/plans' ?>" class="btn-ghost py-3">Cancel</a>
    </div>
  </form>
  <?php if ($plan): ?>
  <div class="mt-10 border-t border-line pt-6">
    <?= post_button('/plans/' . $plan['id'] . '/delete', 'Delete this plan', 'btn-danger', [], 'Delete this plan and all its votes and comments?') ?>
  </div>
  <?php endif ?>
</div>
